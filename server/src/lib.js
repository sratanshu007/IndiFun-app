import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from './config.js';
import { db, now, uid } from './db.js';

// ---------- errors ----------
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}
export const bad = (code, msg) => new ApiError(400, code, msg);
export const notFound = (msg = 'Not found') => new ApiError(404, 'not_found', msg);
export const forbidden = (msg = 'Forbidden') => new ApiError(403, 'forbidden', msg);

// ---------- auth ----------
export const signUser = (user) => jwt.sign({ sub: user.id, kind: 'user' }, config.jwtSecret, { expiresIn: '30d' });
export const signAdmin = (a) => jwt.sign({ sub: a.id, kind: 'admin', role: a.role, agencyId: a.agency_id || null }, config.jwtSecret, { expiresIn: '7d' });
export const verifyToken = (t) => jwt.verify(t, config.jwtSecret);

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function userAuth(req, _res, next) {
  const t = bearer(req);
  if (!t) throw new ApiError(401, 'unauthorized', 'Login required');
  let p;
  try { p = verifyToken(t); } catch { throw new ApiError(401, 'unauthorized', 'Session expired'); }
  if (p.kind !== 'user') throw new ApiError(401, 'unauthorized');
  const user = await db.one('SELECT * FROM users WHERE id = ?', [p.sub]);
  if (!user) throw new ApiError(401, 'unauthorized');
  if (user.status === 'banned' && user.ban_until > now()) {
    if (!req.allowBanned) throw new ApiError(403, 'banned', 'Your account is banned');
    req.banned = true;
  }
  req.user = user;
  next();
}
// For the appeal screen: a banned user can still read their status and send an appeal.
export const userAuthAllowBanned = (req, res, next) => { req.allowBanned = true; return userAuth(req, res, next); };

export function ageOf(dob) {
  if (!dob) return null;
  return (now() - Date.parse(dob)) / (365.25 * 864e5);
}
export function requireAdult(u) {
  const a = ageOf(u.dob);
  if (a === null) throw bad('need_age', 'Add your date of birth (18+) in your profile first');
  if (!(a >= 18)) throw bad('underage', 'You must be 18 or older');
}

export const adminAuth = (...roles) => async (req, _res, next) => {
  const t = bearer(req);
  if (!t) throw new ApiError(401, 'unauthorized');
  let p;
  try { p = verifyToken(t); } catch { throw new ApiError(401, 'unauthorized', 'Session expired'); }
  if (p.kind !== 'admin') throw new ApiError(401, 'unauthorized');
  if (roles.length && !roles.includes(p.role) && p.role !== 'super') throw forbidden();
  req.admin = { id: p.sub, role: p.role, agencyId: p.agencyId };
  next();
};

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
export function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
}

// ---------- settings ----------
export const DEFAULT_SETTINGS = {
  app_name: 'Indi Fun',
  diamonds_per_rupee: '25', // 10,000 diamonds = Rs 400 (host share 40% of Rs 1,000 spent)
  coins_per_rupee: '10',
  min_withdraw_diamonds: '12500',
  pk_duration_sec: '300',
  banner_threshold_coins: '2000',
  new_user_bonus_coins: '100',
  new_host_bonus_pct: '2',
  heartbeat_timeout_sec: '90',
  max_audio_seats: '8',
  host_auto_approve: '1', // set to 0 to review every host application in the admin panel
  // ---- trust & safety ----
  gift_confirm_coins: '5000', // ask "are you sure?" before a single send worth this many coins or more
  refund_window_hours: '24', // accidental recharge: refund if asked within this time and coins are unspent
  refund_max_per_30d: '1',
  limit_raise_delay_hours: '24', // raising your own daily spend limit takes effect after this delay
  require_kyc_to_go_live: '1', // hosts must pass ID + live selfie check before going live
  live_check_minutes: '10', // every N minutes the host must tap "I'm live" (0 = off). 2 misses end the live
  snapshot_sec: '60', // host app sends a small frame every N seconds for the moderation wall / AI check
  ai_moderation: '1', // uses ANTHROPIC_API_KEY when set
  ai_auto_end: '0', // 1 = AI ends a live automatically on high-confidence nudity
  chat_strikes_to_mute: '3',
  auto_payout_max_paise: '0', // RazorpayX instant UPI payout for verified hosts up to this amount (0 = off)
};
let settingsCache = null;
export async function settings() {
  if (!settingsCache) {
    const rows = await db.all('SELECT key, value FROM settings');
    settingsCache = { ...DEFAULT_SETTINGS };
    for (const r of rows) settingsCache[r.key] = r.value;
  }
  return settingsCache;
}
export const setting = async (k) => (await settings())[k];
export const num = async (k) => Number(await setting(k));
export const clearSettingsCache = () => { settingsCache = null; };

// ---------- levels ----------
export const userLevel = (coinsSpent) => Math.min(100, Math.floor(Math.sqrt(Number(coinsSpent || 0) / 50)) + 1);
export const hostLevel = (diamonds) => Math.min(50, Math.floor(Math.sqrt(Number(diamonds || 0) / 200)) + 1);

// ---------- wallet (ledger based) ----------
const CUR = { coins: 'coins', diamonds: 'diamonds' };
export async function moveMoney(q, { userId, currency, amount, type, refId = null, idemKey = null, note = null }) {
  const col = CUR[currency];
  if (!col) throw new Error('bad currency');
  amount = Math.trunc(amount);
  await q('INSERT INTO wallets (user_id, coins, diamonds) SELECT CAST(? AS TEXT), 0, 0 WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = ?)', [userId, userId]);
  const r = await q(`UPDATE wallets SET ${col} = ${col} + ? WHERE user_id = ? AND ${col} + ? >= 0 RETURNING ${col} AS bal`, [amount, userId, amount]);
  if (!r.rows.length) throw bad('insufficient_balance', currency === 'coins' ? 'Not enough coins' : 'Not enough diamonds');
  const bal = Number(r.rows[0].bal);
  await q('INSERT INTO ledger (id, user_id, currency, amount, balance_after, type, ref_id, idem_key, note, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [uid(), userId, currency, amount, bal, type, refId, idemKey, note, now()]);
  return bal;
}
export async function wallet(userId) {
  const w = await db.one('SELECT coins, diamonds FROM wallets WHERE user_id = ?', [userId]);
  return w ? { coins: Number(w.coins), diamonds: Number(w.diamonds) } : { coins: 0, diamonds: 0 };
}

// ---------- moderation ----------
const BAD_WORDS = ['madarchod', 'bhenchod', 'behenchod', 'chutiya', 'gandu', 'randi', 'bsdk', 'mc', 'bc', 'lund', 'loda', 'bhosdi', 'bhosdike', 'harami', 'kutti', 'fuck', 'bitch', 'slut', 'whore', 'nude', 'nudes', 'sex', 'नंगी', 'चूतिया', 'रंडी', 'भोसडी', 'मादरचोद', 'كس', 'شرموطة', 'زب', 'قحبة', 'نيك'];
const badRe = new RegExp(`(^|\\s)(${BAD_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=\\s|$)`, 'gi');
export function hasBadWords(text) {
  badRe.lastIndex = 0;
  return badRe.test(String(text || ''));
}
export function cleanText(text) {
  let t = String(text || '').slice(0, 300).trim();
  t = t.replace(badRe, (m, pre) => `${pre}***`);
  t = t.replace(/(\+?\d[\d\s-]{8,}\d)/g, '[number hidden]'); // no phone numbers in public chat
  t = t.replace(/(https?:\/\/|www\.)\S+/gi, '[link hidden]');
  t = t.replace(/@[a-z0-9._]{3,}|\b(insta|instagram|snap|snapchat|telegram|whatsapp|wa\.me)\b[^\s]*/gi, '[contact hidden]'); // no moving users off-platform
  return t;
}

// ---------- misc ----------
export const today = (t = now()) => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 10); // IST day
export function publicUser(u, extra = {}) {
  if (!u) return null;
  return {
    id: u.id, publicId: u.public_id, name: u.name, avatar: u.avatar, gender: u.gender, bio: u.bio,
    level: userLevel(u.coins_spent), hostLevel: hostLevel(u.diamonds_earned),
    vip: u.vip_expiry > now() ? u.vip_level : 0, isHost: !!u.is_host, verified: !!u.verified, country: u.country || 'IN', ...extra,
  };
}
export async function audit(adminId, action, target, detail) {
  await db.q('INSERT INTO audit_log (id, admin_id, action, target, detail, created_at) VALUES (?,?,?,?,?,?)',
    [uid(), adminId, action, target, detail ? JSON.stringify(detail) : null, now()]);
}
export async function newPublicId(q = db.q) {
  for (;;) {
    const id = String(10000000 + Math.floor(Math.random() * 89999999));
    const r = await q('SELECT 1 AS x FROM users WHERE public_id = ?', [id]);
    if (!r.rows.length) return id;
  }
}
