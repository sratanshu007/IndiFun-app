// Admin: trust & safety queues (host ID checks, ban appeals, refunds, AI / live-check flags),
// private file viewing, and country setup for running worldwide.
import { Router } from 'express';
import fs from 'node:fs';
import { db, now, uid } from '../db.js';
import { adminAuth, bad, notFound, moveMoney, audit, wallet, num } from '../lib.js';
import { privatePath } from '../upload.js';
import { emitUser } from '../realtime.js';
import { countries, clearCountryCache, country, minorFactor } from '../world.js';
import { config } from '../config.js';
import { aiOn } from '../ai.js';

const r = Router();
const any = adminAuth('finance', 'moderator', 'support');
const mod = adminAuth('moderator', 'support');
const finance = adminAuth('finance');
const superOnly = adminAuth('super');
const n = (v) => Number(v || 0);

r.get('/trust/summary', any, async (_req, res) => {
  const c = async (sql) => n((await db.one(sql)).n);
  res.json({
    kyc: await c("SELECT COUNT(*) AS n FROM host_kyc WHERE status = 'pending'"),
    kycApproved: await c("SELECT COUNT(*) AS n FROM host_kyc WHERE status = 'approved'"),
    kycSuspended: await c("SELECT COUNT(*) AS n FROM host_kyc WHERE status = 'suspended'"),
    appeals: await c("SELECT COUNT(*) AS n FROM appeals WHERE status = 'open'"),
    refunds: await c("SELECT COUNT(*) AS n FROM refund_requests WHERE status = 'open'"),
    flags: await c("SELECT COUNT(*) AS n FROM moderation_events WHERE status = 'open'"),
    flaggedLive: await c("SELECT COUNT(*) AS n FROM rooms WHERE status = 'live' AND flagged = 1"),
    ai: aiOn(), kycProvider: config.kycProvider,
  });
});

// Private images (KYC, snapshots, evidence) are only readable through these authenticated routes.
function sendPrivate(res, name) {
  const p = privatePath(name);
  if (!name || !fs.existsSync(p)) throw notFound('File not found');
  res.setHeader('cache-control', 'private, no-store');
  res.sendFile(p);
}
// <img> tags cannot send an Authorization header, so the admin app passes ?t=<token>.
r.use((req, _res, next) => {
  if (!req.headers.authorization && req.query.t && /^\/(kyc|rooms|moderation)\/.+\/(file|snapshot|image)/.test(req.path)) req.headers.authorization = `Bearer ${req.query.t}`;
  next();
});

// ---------- host identity verification ----------
r.get('/kyc', mod, async (req, res) => {
  const status = req.query.status;
  let sql = `SELECT k.*, u.name, u.public_id, u.dob, u.avatar, u.phone, u.status AS user_status, u.host_status, u.is_host, u.coins_spent, u.diamonds_earned, w.coins, w.diamonds
             FROM host_kyc k
             JOIN users u ON u.id = k.user_id
             LEFT JOIN wallets w ON w.user_id = u.id`;
  const params = [];
  if (['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    sql += ' WHERE k.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY k.created_at DESC LIMIT 300';
  const rows = await db.all(sql, params);
  res.json(rows);
});
r.get('/kyc/:userId/file/:which', mod, async (req, res) => {
  const k = await db.one('SELECT id_file, selfie_file FROM host_kyc WHERE user_id = ?', [req.params.userId]);
  if (!k) throw notFound();
  await audit(req.admin.id, 'kyc_view', req.params.userId, { which: req.params.which });
  sendPrivate(res, req.params.which === 'selfie' ? k.selfie_file : k.id_file);
});
r.post('/kyc/:userId/:action', mod, async (req, res) => {
  const k = await db.one('SELECT * FROM host_kyc WHERE user_id = ?', [req.params.userId]);
  if (!k) throw notFound();
  const action = req.params.action;
  if (!['approve', 'reject', 'suspend', 'reconsider'].includes(action)) throw bad('bad_action');
  const note = String(req.body.note || '').slice(0, 200);

  if (action === 'approve') {
    await db.q('UPDATE host_kyc SET status = ?, note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?', ['approved', note, now(), req.admin.id, k.user_id]);
    await db.q("UPDATE users SET verified = 1, is_host = 1, host_status = 'approved' WHERE id = ?", [k.user_id]);
    emitUser(k.user_id, 'notify', { type: 'kyc', text: 'You are verified ✓ You can go live now' });
  } else if (action === 'reject') {
    if (!note) throw bad('need_note', 'Tell the host what to fix');
    await db.q('UPDATE host_kyc SET status = ?, note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?', ['rejected', note, now(), req.admin.id, k.user_id]);
    await db.q("UPDATE users SET verified = 0, is_host = 0, host_status = 'rejected' WHERE id = ?", [k.user_id]);
    emitUser(k.user_id, 'notify', { type: 'kyc', text: `Verification needs a fix: ${note}` });
  } else if (action === 'suspend') {
    const suspendReason = note || 'Host suspended by administrator';
    await db.q('UPDATE host_kyc SET status = ?, note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?', ['suspended', suspendReason, now(), req.admin.id, k.user_id]);
    await db.q("UPDATE users SET verified = 0, is_host = 0, host_status = 'suspended' WHERE id = ?", [k.user_id]);
    const { endRoom } = await import('./live.js');
    const live = await db.all("SELECT id FROM rooms WHERE host_id = ? AND status = 'live'", [k.user_id]);
    for (const l of live) await endRoom(l.id, 'host_suspended');
    emitUser(k.user_id, 'notify', { type: 'kyc', text: `Your host status has been suspended: ${suspendReason}` });
  } else if (action === 'reconsider') {
    const approveNow = req.body.mode === 'approve' || req.body.approve === true;
    if (approveNow) {
      await db.q('UPDATE host_kyc SET status = ?, note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?', ['approved', note || 'Reconsidered and approved by admin', now(), req.admin.id, k.user_id]);
      await db.q("UPDATE users SET verified = 1, is_host = 1, host_status = 'approved' WHERE id = ?", [k.user_id]);
      emitUser(k.user_id, 'notify', { type: 'kyc', text: 'Your host status has been reconsidered and approved ✓ You can go live now' });
    } else {
      await db.q('UPDATE host_kyc SET status = ?, note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?', ['pending', note || 'Reopened for verification review', now(), req.admin.id, k.user_id]);
      await db.q("UPDATE users SET verified = 0, is_host = 0, host_status = 'pending' WHERE id = ?", [k.user_id]);
      emitUser(k.user_id, 'notify', { type: 'kyc', text: 'Your host verification is being reconsidered by admin' });
    }
  }

  await audit(req.admin.id, `kyc_${action}`, k.user_id, { note });
  res.json({ ok: true });
});

// ---------- ban appeals ----------
r.get('/appeals', mod, async (req, res) => {
  const status = req.query.status || 'open';
  const rows = await db.all(`SELECT a.*, u.name, u.public_id, u.ban_until, u.status AS user_status FROM appeals a JOIN users u ON u.id = a.user_id
    WHERE a.status = ? ORDER BY a.created_at DESC LIMIT 200`, [status]);
  for (const x of rows) x.wallet = await wallet(x.user_id);
  res.json(rows);
});
r.post('/appeals/:id/:action', mod, async (req, res) => {
  const a = await db.one("SELECT * FROM appeals WHERE id = ? AND status = 'open'", [req.params.id]);
  if (!a) throw notFound('Already handled');
  const note = String(req.body.note || '').slice(0, 300);
  const action = req.params.action;
  if (action === 'accept') {
    await db.q("UPDATE users SET status = 'active', ban_until = 0 WHERE id = ?", [a.user_id]);
    await db.q("UPDATE appeals SET status = 'accepted', note = ?, decided_at = ? WHERE id = ?", [note, now(), a.id]);
  } else if (action === 'reject') {
    await db.q("UPDATE appeals SET status = 'rejected', note = ?, decided_at = ? WHERE id = ?", [note, now(), a.id]);
  } else if (action === 'settle') {
    // Ban stays, but the host's earned diamonds are paid out (unless the money came from fraud).
    const u = await db.one('SELECT * FROM users WHERE id = ?', [a.user_id]);
    const w = await wallet(a.user_id);
    if (!a.payout_method || !a.payout_account) throw bad('need_account', 'The user did not give payout details');
    if (w.diamonds <= 0) throw bad('nothing', 'No diamonds to settle');
    const c = await country(u.country);
    const perUnit = c.code === 'IN' ? await num('diamonds_per_rupee') : c.diamonds_per_unit;
    const id = uid();
    await db.tx(async (q) => {
      await moveMoney(q, { userId: a.user_id, currency: 'diamonds', amount: -w.diamonds, type: 'withdraw', refId: id, note: 'Final settlement after ban' });
      await q('INSERT INTO withdrawals (id, user_id, diamonds, amount_paise, method, account, status, note, created_at, currency, country) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [id, a.user_id, w.diamonds, Math.floor((w.diamonds / perUnit) * minorFactor(c.currency)), a.payout_method, a.payout_account, 'requested', 'Final settlement after ban', now(), c.currency, c.code]);
      await q("UPDATE appeals SET status = 'settled', note = ?, decided_at = ? WHERE id = ?", [note || 'Earnings settled', now(), a.id]);
    });
  } else throw bad('bad_action');
  await audit(req.admin.id, `appeal_${action}`, a.user_id, { note });
  res.json({ ok: true });
});

// ---------- accidental-recharge refunds ----------
r.get('/refunds', finance, async (req, res) => {
  const status = req.query.status || 'open';
  res.json(await db.all(`SELECT rr.*, u.name, u.public_id, o.amount_paise, o.currency, o.channel, o.gateway_payment_id, o.created_at AS paid_at
    FROM refund_requests rr JOIN users u ON u.id = rr.user_id JOIN recharge_orders o ON o.id = rr.order_id
    WHERE rr.status = ? ORDER BY rr.created_at DESC LIMIT 200`, [status]));
});
r.post('/refunds/:id/:action', finance, async (req, res) => {
  const rr = await db.one("SELECT * FROM refund_requests WHERE id = ? AND status = 'open'", [req.params.id]);
  if (!rr) throw notFound('Already handled');
  const o = await db.one('SELECT * FROM recharge_orders WHERE id = ?', [rr.order_id]);
  const note = String(req.body.note || '').slice(0, 200);
  if (req.params.action === 'refund') {
    let ref = 'manual';
    if (o.channel === 'razorpay' && o.gateway_payment_id && config.razorpayKeyId) {
      const auth = Buffer.from(`${config.razorpayKeyId}:${config.razorpaySecret}`).toString('base64');
      const resp = await fetch(`https://api.razorpay.com/v1/payments/${o.gateway_payment_id}/refund`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
        body: JSON.stringify({ amount: Number(o.amount_paise), notes: { refund_request: rr.id } }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw bad('gateway', `Razorpay: ${data?.error?.description || resp.status}`);
      ref = data.id;
    }
    await db.q("UPDATE refund_requests SET status = 'refunded', note = ?, decided_at = ? WHERE id = ?", [note || ref, now(), rr.id]);
    await db.q("UPDATE recharge_orders SET status = 'refunded', refunded_at = ? WHERE id = ?", [now(), o.id]);
    emitUser(rr.user_id, 'notify', { type: 'refund', text: 'Your refund was approved. Money returns to your account in 5-7 working days.' });
  } else if (req.params.action === 'reject') {
    await db.tx(async (q) => {
      await moveMoney(q, { userId: rr.user_id, currency: 'coins', amount: Number(rr.coins), type: 'refund_release', refId: o.id, idemKey: `refund_release:${o.id}`, note: 'Refund declined, coins returned' });
      await q("UPDATE refund_requests SET status = 'rejected', note = ?, decided_at = ? WHERE id = ?", [note, now(), rr.id]);
      await q("UPDATE recharge_orders SET status = 'paid' WHERE id = ?", [o.id]);
    });
    emitUser(rr.user_id, 'notify', { type: 'refund', text: `Refund declined, your coins are back. ${note}` });
  } else throw bad('bad_action');
  await audit(req.admin.id, `refund_${req.params.action}`, rr.id, { note });
  res.json({ ok: true });
});

// ---------- moderation flags & live wall ----------
r.get('/moderation', mod, async (req, res) => {
  const status = req.query.status === 'reviewed' ? 'reviewed' : 'open';
  res.json(await db.all(`SELECT m.*, u.name AS user_name, u.public_id, r.title AS room_title, r.status AS room_status FROM moderation_events m
    LEFT JOIN users u ON u.id = m.user_id LEFT JOIN rooms r ON r.id = m.room_id WHERE m.status = ? ORDER BY m.created_at DESC LIMIT 200`, [status]));
});
r.post('/moderation/:id/review', mod, async (req, res) => {
  const ev = await db.one('SELECT * FROM moderation_events WHERE id = ?', [req.params.id]);
  if (!ev) throw notFound();
  await db.q("UPDATE moderation_events SET status = 'reviewed', action = ? WHERE id = ?", [String(req.body.action || 'ok').slice(0, 40), ev.id]);
  if (req.body.action === 'clear' && ev.room_id) await db.q('UPDATE rooms SET flagged = 0, ai_note = NULL WHERE id = ?', [ev.room_id]);
  await audit(req.admin.id, 'moderation_review', ev.id, req.body);
  res.json({ ok: true });
});
r.get('/moderation/:id/image', mod, async (req, res) => {
  const ev = await db.one('SELECT image FROM moderation_events WHERE id = ?', [req.params.id]);
  sendPrivate(res, ev?.image);
});
r.get('/rooms/:id/snapshot', mod, async (req, res) => {
  const room = await db.one('SELECT snapshot FROM rooms WHERE id = ?', [req.params.id]);
  sendPrivate(res, room?.snapshot);
});

// ---------- countries ----------
r.get('/countries', any, async (_req, res) => res.json(await countries()));
const CFIELDS = ['name', 'dial_code', 'currency', 'symbol', 'coins_per_unit', 'diamonds_per_unit', 'payment_methods', 'payout_methods', 'default_language', 'region', 'active', 'sort'];
r.put('/countries/:code', superOnly, async (req, res) => {
  const o = {};
  for (const f of CFIELDS) if (req.body[f] !== undefined) o[f] = Array.isArray(req.body[f]) ? JSON.stringify(req.body[f]) : req.body[f];
  if (o.coins_per_unit !== undefined && !(Number(o.coins_per_unit) > 0)) throw bad('bad_rate', 'Coins per unit must be more than 0');
  if (o.diamonds_per_unit !== undefined && !(Number(o.diamonds_per_unit) > 0)) throw bad('bad_rate', 'Diamonds per unit must be more than 0');
  const code = String(req.params.code).toUpperCase().slice(0, 2);
  const ex = await db.one('SELECT code FROM countries WHERE code = ?', [code]);
  if (ex) {
    const keys = Object.keys(o);
    if (keys.length) await db.q(`UPDATE countries SET ${keys.map((k) => `${k} = ?`).join(',')} WHERE code = ?`, [...keys.map((k) => o[k]), code]);
  } else {
    for (const f of ['name', 'dial_code', 'currency', 'symbol', 'coins_per_unit', 'diamonds_per_unit']) if (o[f] === undefined || o[f] === '') throw bad('missing', `${f} is required`);
    const keys = ['code', ...Object.keys(o)];
    await db.q(`INSERT INTO countries (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, [code, ...Object.values(o)]);
  }
  clearCountryCache();
  await audit(req.admin.id, 'country_update', code, o);
  res.json(await db.one('SELECT * FROM countries WHERE code = ?', [code]));
});

export default r;
