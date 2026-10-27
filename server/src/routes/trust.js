// Trust & safety for users and hosts: spend limits, accidental-recharge refunds, host ID verification,
// ban appeals, report status, chat translation and live-frame snapshots for moderation.
import { Router } from 'express';
import fs from 'node:fs';
import { db, now, uid } from '../db.js';
import { userAuth, userAuthAllowBanned, bad, notFound, forbidden, moveMoney, wallet, num, setting, cleanText, today } from '../lib.js';
import { privateUpload, privatePath } from '../upload.js';
import { countries, country, coinsToLocal, money } from '../world.js';
import { translate, checkImage, aiOn } from '../ai.js';
import { emitRoom } from '../realtime.js';
import { config } from '../config.js';

export const publicTrust = Router();
const r = Router();
const HOUR = 3600e3;

// ---------- countries (public: needed on the login screen) ----------
publicTrust.get('/countries', async (_req, res) => {
  res.json((await countries()).filter((c) => c.active).map((c) => ({
    code: c.code, name: c.name, dial: c.dial_code, currency: c.currency, symbol: c.symbol, language: c.default_language, region: c.region,
  })));
});

// ---------- ban appeal (works while banned) ----------
r.get('/appeal', userAuthAllowBanned, async (req, res) => {
  const u = req.user;
  res.json({
    banned: !!req.banned, banUntil: Number(u.ban_until),
    wallet: await wallet(u.id),
    appeals: await db.all('SELECT id, text, status, note, created_at, decided_at FROM appeals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [u.id]),
    payoutMethods: (await country(u.country)).payout_methods,
  });
});
r.post('/appeal', userAuthAllowBanned, async (req, res) => {
  if (!req.banned) throw bad('not_banned', 'Your account is not banned');
  const open = await db.one("SELECT id FROM appeals WHERE user_id = ? AND status = 'open'", [req.user.id]);
  if (open) throw bad('already_open', 'Your appeal is already being reviewed');
  const text = String(req.body.text || '').trim().slice(0, 1000);
  if (text.length < 10) throw bad('too_short', 'Please explain in a few words');
  await db.q('INSERT INTO appeals (id, user_id, text, payout_method, payout_account, status, created_at) VALUES (?,?,?,?,?,?,?)',
    [uid(), req.user.id, text, req.body.payoutMethod || null, req.body.payoutAccount ? String(req.body.payoutAccount).slice(0, 120) : null, 'open', now()]);
  res.json({ ok: true });
});

r.use(userAuth);

// ---------- spend safety ----------
async function spentToday(userId) {
  const start = Date.parse(`${today()}T00:00:00+05:30`);
  const row = await db.one("SELECT COALESCE(SUM(-amount),0) AS s FROM ledger WHERE user_id = ? AND currency = 'coins' AND type = 'gift_send' AND created_at >= ?", [userId, start]);
  return Number(row.s);
}
export async function effectiveLimit(u) {
  // A raised limit only applies after the cooling-off delay; a lowered one applies at once.
  if (u.pending_limit_coins !== null && u.pending_limit_coins !== undefined && Number(u.pending_limit_at) <= now()) {
    await db.q('UPDATE users SET daily_limit_coins = ?, pending_limit_coins = NULL, pending_limit_at = NULL WHERE id = ?', [u.pending_limit_coins, u.id]);
    return Number(u.pending_limit_coins);
  }
  return Number(u.daily_limit_coins || 0);
}
export async function checkSpend(u, coins, confirmed) {
  const limit = await effectiveLimit(u);
  if (limit > 0) {
    const spent = await spentToday(u.id);
    if (spent + coins > limit) throw bad('daily_limit', `This would cross your daily gift limit of ${limit} coins (used ${spent}). You can change it in Safety settings.`);
  }
  const confirmAt = await num('gift_confirm_coins');
  if (confirmAt > 0 && coins >= confirmAt && !confirmed) {
    const c = await country(u.country);
    const err = bad('confirm_needed', `Send gifts worth ${coins} coins (about ${coinsToLocal(coins, c).label})?`);
    err.extra = { coins, local: coinsToLocal(coins, c).label };
    throw err;
  }
}

r.get('/safety', async (req, res) => {
  const u = req.user;
  const c = await country(u.country);
  const windowH = await num('refund_window_hours');
  const orders = await db.all(`SELECT o.*, rr.status AS refund_status FROM recharge_orders o LEFT JOIN refund_requests rr ON rr.order_id = o.id
    WHERE o.user_id = ? AND o.status IN ('paid','refund_requested','refunded') AND o.created_at > ? ORDER BY o.created_at DESC`, [u.id, now() - 7 * 24 * HOUR]);
  const w = await wallet(u.id);
  res.json({
    dailyLimit: await effectiveLimit(u), pendingLimit: u.pending_limit_coins ?? null, pendingAt: u.pending_limit_at ? Number(u.pending_limit_at) : null,
    spentToday: await spentToday(u.id), confirmCoins: await num('gift_confirm_coins'), raiseDelayHours: await num('limit_raise_delay_hours'),
    refundWindowHours: windowH, coinsPerUnit: c.coins_per_unit, currency: c.currency, symbol: c.symbol,
    orders: orders.map((o) => ({
      id: o.id, coins: Number(o.coins), amount: money(o.amount_paise, o.currency || 'INR', o.currency === c.currency ? c.symbol : null), at: Number(o.created_at),
      status: o.status, refundStatus: o.refund_status || null,
      canRefund: o.status === 'paid' && !o.refund_status && Number(o.created_at) > now() - windowH * HOUR && w.coins >= Number(o.coins),
    })),
  });
});

r.put('/safety/limit', async (req, res) => {
  const u = req.user;
  const want = Math.max(0, Math.floor(Number(req.body.coins || 0)));
  const cur = await effectiveLimit(u);
  const lowering = want > 0 && (cur === 0 || want < cur);
  if (lowering) {
    await db.q('UPDATE users SET daily_limit_coins = ?, pending_limit_coins = NULL, pending_limit_at = NULL WHERE id = ?', [want, u.id]);
    return res.json({ dailyLimit: want, pendingLimit: null });
  }
  if (want === cur) return res.json({ dailyLimit: cur, pendingLimit: null });
  const at = now() + (await num('limit_raise_delay_hours')) * HOUR;
  await db.q('UPDATE users SET pending_limit_coins = ?, pending_limit_at = ? WHERE id = ?', [want, at, u.id]);
  res.json({ dailyLimit: cur, pendingLimit: want, pendingAt: at });
});

// ---------- accidental recharge refund ----------
r.post('/recharge/:id/refund', async (req, res) => {
  const u = req.user;
  const o = await db.one('SELECT * FROM recharge_orders WHERE id = ? AND user_id = ?', [req.params.id, u.id]);
  if (!o) throw notFound('Order not found');
  if (o.status !== 'paid') throw bad('not_refundable', 'This recharge cannot be refunded');
  const windowH = await num('refund_window_hours');
  if (Number(o.created_at) < now() - windowH * HOUR) throw bad('too_late', `Refunds are possible within ${windowH} hours of the recharge`);
  const recent = await db.one('SELECT COUNT(*) AS n FROM refund_requests WHERE user_id = ? AND created_at > ?', [u.id, now() - 30 * 24 * HOUR]);
  if (Number(recent.n) >= (await num('refund_max_per_30d'))) throw bad('limit', 'You have already asked for a refund this month');
  const reason = String(req.body.reason || '').trim().slice(0, 300) || 'Accidental recharge';
  const id = uid();
  await db.tx(async (q) => {
    // Coins are held right away so they cannot be spent while the refund is processed.
    await moveMoney(q, { userId: u.id, currency: 'coins', amount: -Number(o.coins), type: 'refund_hold', refId: o.id, idemKey: `refund_hold:${o.id}`, note: 'Held for refund' });
    await q('INSERT INTO refund_requests (id, user_id, order_id, coins, reason, status, created_at) VALUES (?,?,?,?,?,?,?)', [id, u.id, o.id, Number(o.coins), reason, 'open', now()]);
    await q("UPDATE recharge_orders SET status = 'refund_requested' WHERE id = ?", [o.id]);
  });
  res.json({ ok: true, wallet: await wallet(u.id) });
});

// ---------- host identity verification ----------
const CHALLENGES = ['Show 2 fingers (✌️) next to your face', 'Touch your right ear', 'Give a thumbs up 👍', 'Show 3 fingers', 'Put your hand on your forehead', 'Show an open palm ✋'];
const challenges = new Map();
r.get('/kyc/me', async (req, res) => {
  const k = await db.one('SELECT status, doc_type, doc_last4, legal_name, note, created_at, decided_at FROM host_kyc WHERE user_id = ?', [req.user.id]);
  const u = await db.one('SELECT host_status, is_host, verified FROM users WHERE id = ?', [req.user.id]);
  res.json({
    kyc: k,
    verified: !!u?.verified,
    isHost: !!u?.is_host,
    hostStatus: u?.host_status || 'none',
    required: (await setting('require_kyc_to_go_live')) === '1',
    provider: config.kycProvider,
  });
});
r.get('/kyc/challenge', async (req, res) => {
  const text = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  challenges.set(req.user.id, { text, at: now() });
  res.json({ text });
});
const DOCS = ['aadhaar', 'pan', 'passport', 'driving_licence', 'voter_id', 'national_id', 'emirates_id', 'iqama'];
r.post('/kyc', privateUpload.fields([{ name: 'id', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), async (req, res) => {
  const u = req.user;
  const idf = req.files?.id?.[0], self = req.files?.selfie?.[0];
  const cleanup = () => [idf, self].forEach((f) => f && fs.rm(f.path, () => {}));
  try {
    if (!idf || !self) throw bad('need_files', 'Add a photo of your ID and take a live selfie');
    const ch = challenges.get(u.id);
    if (!ch || now() - ch.at > 15 * 60e3) throw bad('challenge_expired', 'The selfie check expired, please take the selfie again');
    const docType = String(req.body.docType || '');
    if (!DOCS.includes(docType)) throw bad('bad_doc', 'Choose your ID type');
    const legal = cleanText(req.body.legalName || '').slice(0, 80);
    if (legal.length < 3) throw bad('need_name', 'Enter your name exactly as on the ID');
    // Store last 4 of ID / Aadhaar number
    const last4 = String(req.body.docNumber || '').replace(/[^0-9a-z]/gi, '').slice(-4).toUpperCase();
    const ex = await db.one('SELECT status, id_file, selfie_file FROM host_kyc WHERE user_id = ?', [u.id]);
    if (ex?.status === 'approved') throw bad('already', 'You are already verified');
    if (ex) {
      for (const f of [ex.id_file, ex.selfie_file]) fs.rm(privatePath(f), () => {});
      await db.q('DELETE FROM host_kyc WHERE user_id = ?', [u.id]);
    }
    await db.q(`INSERT INTO host_kyc (user_id, legal_name, country, doc_type, doc_last4, id_file, selfie_file, challenge, provider, status, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [u.id, legal, u.country || 'IN', docType, last4, idf.filename, self.filename, ch.text, config.kycProvider, 'pending', now()]);
    await db.q("UPDATE users SET host_status = 'pending' WHERE id = ?", [u.id]);
    challenges.delete(u.id);
    res.json({ ok: true, status: 'pending' });
  } catch (e) { cleanup(); throw e; }
});

// ---------- my reports ----------
r.get('/reports/mine', async (req, res) => {
  res.json(await db.all('SELECT id, target_type, reason, status, action, created_at FROM reports WHERE reporter_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]));
});

// ---------- chat translation ----------
r.post('/translate', async (req, res) => {
  const texts = (Array.isArray(req.body.texts) ? req.body.texts : []).slice(0, 25).map((t) => String(t).slice(0, 300));
  const to = String(req.body.to || 'en').slice(0, 5);
  if (!texts.length) return res.json({ available: aiOn(), texts: [] });
  try { res.json(await translate(texts, to)); } catch (e) { console.error('translate', e.message); res.json({ available: false, texts }); }
});

// ---------- live snapshot for the moderation wall / AI check ----------
r.post('/live/:id/snapshot', privateUpload.single('frame'), async (req, res) => {
  const room = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live'", [req.params.id]);
  if (!req.file) throw bad('no_file');
  if (!room || room.host_id !== req.user.id) { fs.rm(req.file.path, () => {}); throw forbidden(); }
  if (room.snapshot) fs.rm(privatePath(room.snapshot), () => {});
  await db.q('UPDATE rooms SET snapshot = ?, snapshot_at = ? WHERE id = ?', [req.file.filename, now(), room.id]);
  res.json({ ok: true });
  if ((await setting('ai_moderation')) === '1' && aiOn()) reviewFrame(room, req.file.path).catch((e) => console.error('ai frame', e.message));
});

async function reviewFrame(room, file) {
  const v = await checkImage(file);
  if (!v.available || v.safe !== false) return;
  const conf = Number(v.confidence || 0);
  const severity = conf >= 0.85 ? 'high' : conf >= 0.6 ? 'medium' : 'low';
  // keep a copy of the frame as evidence for the moderator
  const keep = `evidence-${Date.now()}-${room.id.slice(0, 8)}.jpg`;
  fs.copyFileSync(file, privatePath(keep));
  await db.q('UPDATE rooms SET flagged = 1, ai_note = ? WHERE id = ?', [`${v.category}: ${v.reason || ''}`.slice(0, 200), room.id]);
  await db.q('INSERT INTO moderation_events (id, kind, room_id, user_id, severity, detail, image, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [uid(), 'ai_image', room.id, room.host_id, severity, JSON.stringify(v), keep, 'open', now()]);
  if (severity === 'high' && ['nudity', 'sexual', 'minor_alone'].includes(v.category) && (await setting('ai_auto_end')) === '1') {
    const { endRoom } = await import('./live.js');
    await endRoom(room.id, 'banned');
    await db.q('INSERT INTO moderation_events (id, kind, room_id, user_id, severity, detail, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [uid(), 'auto_end', room.id, room.host_id, 'high', `Live ended automatically: ${v.category}`, 'open', now()]);
  } else if (severity !== 'low') {
    emitRoom(room.id, 'system', { text: 'Reminder from moderators: please follow the community rules.', level: 'warn' });
  }
}

export default r;
