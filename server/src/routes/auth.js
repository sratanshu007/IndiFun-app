import { Router } from 'express';
import { config } from '../config.js';
import { db, now, uid } from '../db.js';
import { bad, signUser, signAdmin, checkPassword, moveMoney, num, newPublicId, publicUser, wallet } from '../lib.js';
import { normPhone as normWorld, country as getCountry } from '../world.js';

const r = Router();
const otps = new Map(); // phone -> { code, exp, tries }

// Normalizes input: handles 10-digit mobile number OR 8-digit public ID
async function normPhone(body) {
  const raw = String(body.phone || '').trim().replace(/\D/g, '');
  const c = await getCountry(String(body.country || 'IN').toUpperCase());

  // 1. Check if user typed an 8-digit public ID
  if (raw.length === 8) {
    const existing = await db.one('SELECT * FROM users WHERE public_id = ?', [raw]);
    if (existing) {
      return { phone: existing.phone, c, matchedUser: existing };
    }
  }

  // 2. Normal phone number
  try {
    return { phone: normWorld(body.phone, c.code, String(c.dial_code)), c };
  } catch (err) {
    // If not matching phone regex, also check if public_id matches
    const existing = await db.one('SELECT * FROM users WHERE public_id = ? OR phone = ?', [raw, raw]);
    if (existing) {
      return { phone: existing.phone, c, matchedUser: existing };
    }
    throw err;
  }
}

r.post('/otp/send', async (req, res) => {
  const { phone } = await normPhone(req.body);
  const prev = otps.get(phone);
  if (prev && prev.sentAt > now() - 10e3) throw bad('too_soon', 'Please wait a few seconds before asking again');

  const code = config.otpProvider === 'dev' ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
  otps.set(phone, { code, exp: now() + 15 * 60e3, tries: 0, sentAt: now() });

  if (config.otpProvider === 'msg91') {
    const resp = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authkey: config.msg91AuthKey },
      body: JSON.stringify({
        template_id: config.msg91TemplateId,
        mobile: phone.startsWith('+') ? phone.slice(1) : `91${phone}`,
        otp: code,
      }),
    });
    if (!resp.ok) throw bad('otp_failed', 'Could not send OTP, try again');
  }

  res.json({ ok: true, dev: config.otpProvider === 'dev' ? 'Use OTP 123456' : undefined });
});

r.post('/otp/verify', async (req, res) => {
  const { phone, c, matchedUser } = await normPhone(req.body);
  const inputCode = String(req.body.code || '').trim();

  // In dev mode, OTP 123456 always succeeds
  if (config.otpProvider === 'dev' && inputCode === '123456') {
    otps.delete(phone);
  } else {
    const rec = otps.get(phone);
    if (!rec || rec.exp < now()) throw bad('otp_expired', 'OTP expired, request a new one');
    if (++rec.tries > 5) throw bad('otp_locked', 'Too many attempts');
    if (inputCode !== rec.code) throw bad('otp_wrong', 'Wrong OTP');
    otps.delete(phone);
  }

  let user = matchedUser || (await db.one('SELECT * FROM users WHERE phone = ?', [phone]));
  let isNew = false;

  if (!user) {
    isNew = true;
    const id = uid();
    const bonus = await num('new_user_bonus_coins');
    await db.tx(async (q) => {
      const publicId = await newPublicId(q);
      await q('INSERT INTO users (id, public_id, phone, name, dob, verified, is_host, host_status, created_at, country, language) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [id, publicId, phone, `User${publicId.slice(-4)}`, null, 0, 0, 'none', now(), c.code, c.default_language || 'en']);
      await q('INSERT INTO wallets (user_id, coins, diamonds) VALUES (?,0,0)', [id]);
      if (bonus > 0) await moveMoney(q, { userId: id, currency: 'coins', amount: bonus, type: 'signup_bonus' });
    });
    user = await db.one('SELECT * FROM users WHERE id = ?', [id]);
  }

  res.json({ token: signUser(user), isNew, user: publicUser(user), wallet: await wallet(user.id) });
});

r.post('/admin/login', async (req, res) => {
  const a = await db.one('SELECT * FROM admin_users WHERE email = ?', [String(req.body.email || '').toLowerCase().trim()]);
  if (!a || !checkPassword(String(req.body.password || ''), a.password_hash)) throw bad('bad_login', 'Wrong email or password');
  let agency = null;
  if (a.agency_id) agency = await db.one('SELECT id, name, code, status FROM agencies WHERE id = ?', [a.agency_id]);
  res.json({ token: signAdmin(a), admin: { id: a.id, name: a.name, email: a.email, role: a.role, agency } });
});

export default r;
