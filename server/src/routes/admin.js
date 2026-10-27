import { Router } from 'express';
import { db, now, uid } from '../db.js';
import { adminAuth, bad, notFound, moveMoney, wallet, publicUser, audit, hashPassword, settings, clearSettingsCache, DEFAULT_SETTINGS, today } from '../lib.js';
import { upload, fileUrl } from '../upload.js';
import { emitRoom, emitUser, roomState } from '../realtime.js';
import { endRoom } from './live.js';
import { runSettlements, paySettlement, lastWeek, recalcLevels } from '../agencyLogic.js';

const r = Router();
const DAY = 864e5;
const any = adminAuth('finance', 'moderator', 'support');
const finance = adminAuth('finance');
const mod = adminAuth('moderator', 'support');
const superOnly = adminAuth('super');
const n = (v) => Number(v || 0);

// ---------- dashboard ----------
r.get('/dashboard', any, async (_req, res) => {
  const t = now(), d1 = t - DAY;
  const one = async (sql, p = []) => n(Object.values((await db.one(sql, p)) || { x: 0 })[0]);
  const rate = Number((await settings()).diamonds_per_rupee);
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const s = t - (i + 1) * DAY, e = t - i * DAY;
    days.push({
      day: today(e),
      rechargePaise: await one("SELECT COALESCE(SUM(amount_paise),0) FROM recharge_orders WHERE status = 'paid' AND created_at >= ? AND created_at < ?", [s, e]),
      giftCoins: await one('SELECT COALESCE(SUM(coins),0) FROM gift_tx WHERE created_at >= ? AND created_at < ?', [s, e]),
      newUsers: await one('SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?', [s, e]),
    });
  }
  res.json({
    users: await one('SELECT COUNT(*) FROM users'),
    newUsers24h: await one('SELECT COUNT(*) FROM users WHERE created_at > ?', [d1]),
    hosts: await one('SELECT COUNT(*) FROM users WHERE is_host = 1'),
    liveNow: await one("SELECT COUNT(*) FROM rooms WHERE status = 'live'"),
    viewersNow: await one("SELECT COALESCE(SUM(viewers),0) FROM rooms WHERE status = 'live'"),
    recharge24hPaise: await one("SELECT COALESCE(SUM(amount_paise),0) FROM recharge_orders WHERE status = 'paid' AND created_at > ?", [d1]),
    giftCoins24h: await one('SELECT COALESCE(SUM(coins),0) FROM gift_tx WHERE created_at > ?', [d1]),
    pendingWithdrawals: await one("SELECT COUNT(*) FROM withdrawals WHERE status = 'requested'"),
    pendingWithdrawalPaise: await one("SELECT COALESCE(SUM(amount_paise),0) FROM withdrawals WHERE status = 'requested'"),
    openReports: await one("SELECT COUNT(*) FROM reports WHERE status = 'open'"),
    pendingAgencies: await one("SELECT COUNT(*) FROM agencies WHERE status = 'pending'"),
    diamondsPerRupee: rate,
    days,
    topHosts: (await db.all('SELECT receiver_id AS id, SUM(diamonds) AS d FROM gift_tx WHERE created_at > ? GROUP BY receiver_id ORDER BY d DESC LIMIT 5', [d1]))
      .map((x) => ({ id: x.id, diamonds: n(x.d) })),
  });
});

// ---------- users ----------
r.get('/users', any, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const page = Math.max(0, n(req.query.page));
  const filter = req.query.filter;
  let where = '1=1';
  const p = [];
  if (q) { where += ' AND (public_id = ? OR phone = ? OR LOWER(name) LIKE ?)'; p.push(q, q, `%${q}%`); }
  if (filter === 'hosts') where += ' AND is_host = 1';
  if (filter === 'pending_hosts') where += " AND host_status = 'pending'";
  if (filter === 'banned') where += " AND status = 'banned'";
  if (filter === 'vip') where += ` AND vip_expiry > ${now()}`;
  const rows = await db.all(`SELECT u.*, w.coins, w.diamonds FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE ${where} ORDER BY u.created_at DESC LIMIT 50 OFFSET ?`, [...p, page * 50]);
  const total = await db.one(`SELECT COUNT(*) AS c FROM users WHERE ${where}`, p);
  res.json({
    total: n(total.c),
    rows: rows.map((u) => ({ ...publicUser(u), phone: u.phone, status: u.status, hostStatus: u.host_status, coins: n(u.coins), diamonds: n(u.diamonds), coinsSpent: n(u.coins_spent), diamondsEarned: n(u.diamonds_earned), createdAt: u.created_at })),
  });
});

r.get('/users/:id', any, async (req, res) => {
  const u = await db.one('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) throw notFound();
  res.json({
    user: { ...publicUser(u), phone: u.phone, dob: u.dob, status: u.status, banUntil: u.ban_until, hostStatus: u.host_status, coinsSpent: n(u.coins_spent), diamondsEarned: n(u.diamonds_earned), createdAt: u.created_at, strikes: n(u.strikes), dailyLimit: n(u.daily_limit_coins) },
    kyc: await db.one('SELECT * FROM host_kyc WHERE user_id = ?', [u.id]),
    wallet: await wallet(u.id),
    ledger: await db.all('SELECT * FROM ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [u.id]),
    rooms: await db.all('SELECT * FROM rooms WHERE host_id = ? ORDER BY started_at DESC LIMIT 20', [u.id]),
    reports: await db.all("SELECT * FROM reports WHERE target_type = 'user' AND target_id = ? ORDER BY created_at DESC", [u.id]),
  });
});

r.post('/users/:id/ban', mod, async (req, res) => {
  const days = n(req.body.days) || 3650;
  await db.q("UPDATE users SET status = 'banned', ban_until = ? WHERE id = ?", [now() + days * DAY, req.params.id]);
  const live = await db.all("SELECT id FROM rooms WHERE host_id = ? AND status = 'live'", [req.params.id]);
  for (const l of live) await endRoom(l.id, 'banned');
  emitUser(req.params.id, 'banned', { days });
  await audit(req.admin.id, 'ban', req.params.id, { days, reason: req.body.reason });
  res.json({ ok: true });
});
r.post('/users/:id/unban', mod, async (req, res) => {
  await db.q("UPDATE users SET status = 'active', ban_until = 0 WHERE id = ?", [req.params.id]);
  await audit(req.admin.id, 'unban', req.params.id);
  res.json({ ok: true });
});
r.post('/users/:id/adjust', finance, async (req, res) => {
  const amount = Math.trunc(n(req.body.amount));
  const currency = req.body.currency === 'diamonds' ? 'diamonds' : 'coins';
  if (!amount || !req.body.note) throw bad('need_note', 'Amount and reason are required');
  await db.tx((q) => moveMoney(q, { userId: req.params.id, currency, amount, type: 'admin_adjust', note: String(req.body.note).slice(0, 200), refId: req.admin.id }));
  await audit(req.admin.id, 'adjust', req.params.id, { currency, amount, note: req.body.note });
  res.json({ wallet: await wallet(req.params.id) });
});
r.post('/users/:id/host', mod, async (req, res) => {
  const { action, note } = req.body;
  const reason = String(note || '').slice(0, 200);
  if (!['approve', 'reject', 'suspend', 'reconsider', 'revoke'].includes(action)) throw bad('bad_action');

  if (action === 'approve' || action === 'reconsider') {
    await db.q("UPDATE users SET host_status = 'approved', is_host = 1, verified = 1 WHERE id = ?", [req.params.id]);
    await db.q("UPDATE host_kyc SET status = 'approved', note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?",
      [reason || 'Approved by admin', now(), req.admin.id, req.params.id]);
    emitUser(req.params.id, 'notify', { type: 'host', text: 'Your host status has been approved / reinstated ✓' });
  } else if (action === 'suspend') {
    await db.q("UPDATE users SET host_status = 'suspended', is_host = 0, verified = 0 WHERE id = ?", [req.params.id]);
    await db.q("UPDATE host_kyc SET status = 'suspended', note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?",
      [reason || 'Host suspended by admin', now(), req.admin.id, req.params.id]);
    const live = await db.all("SELECT id FROM rooms WHERE host_id = ? AND status = 'live'", [req.params.id]);
    for (const l of live) await endRoom(l.id, 'host_suspended');
    emitUser(req.params.id, 'notify', { type: 'host', text: `Your host status has been suspended: ${reason || 'Contact admin'}` });
  } else if (action === 'reject') {
    await db.q("UPDATE users SET host_status = 'rejected', is_host = 0, verified = 0 WHERE id = ?", [req.params.id]);
    await db.q("UPDATE host_kyc SET status = 'rejected', note = ?, decided_at = ?, decided_by = ? WHERE user_id = ?",
      [reason || 'Rejected by admin', now(), req.admin.id, req.params.id]);
    emitUser(req.params.id, 'notify', { type: 'host', text: `Your host application was rejected: ${reason || 'Fix details'}` });
  } else if (action === 'revoke') {
    await db.q("UPDATE users SET host_status = 'none', is_host = 0, verified = 0 WHERE id = ?", [req.params.id]);
    await db.q("UPDATE host_kyc SET status = 'rejected', note = 'Host status revoked', decided_at = ?, decided_by = ? WHERE user_id = ?",
      [now(), req.admin.id, req.params.id]);
    const live = await db.all("SELECT id FROM rooms WHERE host_id = ? AND status = 'live'", [req.params.id]);
    for (const l of live) await endRoom(l.id, 'host_revoked');
    emitUser(req.params.id, 'notify', { type: 'host', text: 'Your host status has been revoked' });
  }

  await audit(req.admin.id, `host_${action}`, req.params.id, { note: reason });
  res.json({ ok: true });
});

// ---------- live rooms ----------
r.get('/rooms', any, async (req, res) => {
  const status = req.query.status === 'ended' ? 'ended' : 'live';
  const rows = await db.all(`SELECT r.*, u.name AS host_name, u.public_id AS host_pid, u.avatar AS host_avatar, u.verified AS host_verified, u.country AS host_country FROM rooms r JOIN users u ON u.id = r.host_id WHERE r.status = ? ORDER BY r.flagged DESC, r.started_at DESC LIMIT 100`, [status]);
  res.json(rows.map((x) => ({ ...x, viewers: roomState(x.id)?.viewers.size ?? n(x.viewers), inPk: !!roomState(x.id)?.pkId })));
});
r.post('/rooms/:id/end', mod, async (req, res) => {
  await endRoom(req.params.id, 'ended_by_admin');
  await audit(req.admin.id, 'end_room', req.params.id, { reason: req.body.reason });
  res.json({ ok: true });
});
r.post('/rooms/:id/warn', mod, async (req, res) => {
  emitRoom(req.params.id, 'system', { text: `Warning from moderators: ${req.body.text || 'Please follow community guidelines.'}`, level: 'warn' });
  await audit(req.admin.id, 'warn_room', req.params.id, { text: req.body.text });
  res.json({ ok: true });
});

// ---------- generic CRUD for catalog tables ----------
function crud(path, table, fields, fileFields = [], role = superOnly, order = 'sort') {
  const pick = (body, files) => {
    const o = {};
    for (const f of fields) if (body[f] !== undefined && body[f] !== '') o[f] = body[f];
    for (const f of fileFields) if (files?.[f]?.[0]) o[f] = fileUrl(files[f][0]);
    return o;
  };
  const up = upload.fields(fileFields.map((name) => ({ name, maxCount: 1 })));
  r.get(`/${path}`, any, async (_req, res) => res.json(await db.all(`SELECT * FROM ${table} ORDER BY ${order}`)));
  r.post(`/${path}`, role, up, async (req, res) => {
    const o = { id: uid(), ...pick(req.body, req.files) };
    const keys = Object.keys(o);
    await db.q(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => o[k]));
    await audit(req.admin.id, `create_${table}`, o.id, o);
    res.json(await db.one(`SELECT * FROM ${table} WHERE id = ?`, [o.id]));
  });
  r.put(`/${path}/:id`, role, up, async (req, res) => {
    const o = pick(req.body, req.files);
    const keys = Object.keys(o);
    if (keys.length) await db.q(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(',')} WHERE id = ?`, [...keys.map((k) => o[k]), req.params.id]);
    await audit(req.admin.id, `update_${table}`, req.params.id, o);
    res.json(await db.one(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]));
  });
  r.delete(`/${path}/:id`, role, async (req, res) => {
    await db.q(`UPDATE ${table} SET active = 0 WHERE id = ?`, [req.params.id]);
    await audit(req.admin.id, `disable_${table}`, req.params.id);
    res.json({ ok: true });
  });
}
crud('gifts', 'gifts', ['name', 'category', 'coins', 'tier', 'anim_type', 'global_banner', 'active', 'sort', 'region'], ['icon', 'anim_url']);
crud('store-items', 'store_items', ['type', 'name', 'anim_type', 'price', 'days', 'vip_only', 'active'], ['anim_url', 'preview'], superOnly, 'type, price');
crud('packs', 'recharge_packs', ['price_paise', 'coins', 'bonus', 'active', 'sort', 'country', 'currency'], [], finance, 'country, sort');
crud('banners', 'banners', ['title', 'link', 'active', 'sort'], ['image']);

r.get('/vip-tiers', any, async (_req, res) => res.json(await db.all('SELECT * FROM vip_tiers ORDER BY level')));
r.put('/vip-tiers/:level', superOnly, async (req, res) => {
  const { name, price, days, color, entry_item_id: entry, perks } = req.body;
  await db.q('UPDATE vip_tiers SET name = ?, price = ?, days = ?, color = ?, entry_item_id = ?, perks = ? WHERE level = ?',
    [name, n(price), n(days), color, entry || null, typeof perks === 'string' ? perks : JSON.stringify(perks || []), n(req.params.level)]);
  await audit(req.admin.id, 'update_vip', req.params.level, req.body);
  res.json({ ok: true });
});

// ---------- withdrawals ----------
r.get('/withdrawals', finance, async (req, res) => {
  const status = req.query.status || 'requested';
  const rows = await db.all(`SELECT w.*, u.name, u.public_id, u.phone, u.verified FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.status = ? OR (? = 'requested' AND w.status = 'processing') ORDER BY w.created_at DESC LIMIT 200`, [status, status]);
  res.json(rows);
});
r.post('/withdrawals/:id/:action', finance, async (req, res) => {
  const w = await db.one("SELECT * FROM withdrawals WHERE id = ? AND status IN ('requested','processing')", [req.params.id]);
  if (!w) throw notFound('Already processed');
  if (w.status === 'processing' && req.params.action === 'reject') throw bad('in_flight', 'An automatic payout is in progress; check RazorpayX before rejecting');
  if (req.params.action === 'paid') {
    await db.q("UPDATE withdrawals SET status = 'paid', note = ?, decided_at = ? WHERE id = ?", [String(req.body.ref || '').slice(0, 120), now(), w.id]);
    emitUser(w.user_id, 'notify', { type: 'withdraw', text: `Your withdrawal of ${w.currency || 'INR'} ${(n(w.amount_paise) / 100).toFixed(2)} was paid` });
  } else if (req.params.action === 'reject') {
    await db.tx(async (q) => {
      await q("UPDATE withdrawals SET status = 'rejected', note = ?, decided_at = ? WHERE id = ?", [String(req.body.reason || '').slice(0, 200), now(), w.id]);
      await moveMoney(q, { userId: w.user_id, currency: 'diamonds', amount: n(w.diamonds), type: 'withdraw_refund', refId: w.id, idemKey: `wref:${w.id}` });
    });
    emitUser(w.user_id, 'notify', { type: 'withdraw', text: 'Your withdrawal was rejected and diamonds were returned' });
  } else throw bad('bad_action');
  await audit(req.admin.id, `withdraw_${req.params.action}`, w.id, req.body);
  res.json({ ok: true });
});

// ---------- agencies ----------
r.get('/agencies', any, async (req, res) => {
  const rows = await db.all(`SELECT a.*, u.name AS owner_name, u.public_id AS owner_pid,
      (SELECT COUNT(*) FROM agency_hosts WHERE agency_id = a.id AND status = 'active') AS hosts
    FROM agencies a JOIN users u ON u.id = a.owner_user_id ORDER BY a.created_at DESC`);
  res.json(rows.map((a) => ({ ...a, hosts: n(a.hosts) })));
});
r.post('/agencies/:id/status', superOnly, async (req, res) => {
  const status = ['active', 'suspended', 'rejected'].includes(req.body.status) ? req.body.status : null;
  if (!status) throw bad('bad_status');
  await db.q('UPDATE agencies SET status = ? WHERE id = ?', [status, req.params.id]);
  const a = await db.one('SELECT * FROM agencies WHERE id = ?', [req.params.id]);
  emitUser(a.owner_user_id, 'notify', { type: 'agency', text: `Your agency ${a.name} is now ${status}` });
  await audit(req.admin.id, `agency_${status}`, req.params.id);
  res.json({ ok: true });
});
r.put('/agencies/:id', superOnly, async (req, res) => {
  const { level, settlement_mode: mode } = req.body;
  await db.q('UPDATE agencies SET level = COALESCE(?, level), settlement_mode = COALESCE(?, settlement_mode) WHERE id = ?', [level ? n(level) : null, mode || null, req.params.id]);
  await audit(req.admin.id, 'agency_update', req.params.id, req.body);
  res.json({ ok: true });
});
// Create a web-panel login for an agency owner.
r.post('/agencies/:id/login', superOnly, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || String(password).length < 8) throw bad('bad_login', 'Email and an 8+ character password are required');
  const a = await db.one('SELECT * FROM agencies WHERE id = ?', [req.params.id]);
  if (!a) throw notFound();
  await db.q('INSERT INTO admin_users (id, email, password_hash, name, role, agency_id, created_at) VALUES (?,?,?,?,?,?,?)',
    [uid(), String(email).toLowerCase().trim(), hashPassword(String(password)), a.name, 'agency', a.id, now()]);
  await audit(req.admin.id, 'agency_login_created', a.id, { email });
  res.json({ ok: true });
});
r.get('/agency-levels', any, async (_req, res) => res.json(await db.all('SELECT * FROM agency_levels ORDER BY level')));
r.put('/agency-levels', superOnly, async (req, res) => {
  for (const l of req.body.levels || []) {
    await db.q('UPDATE agency_levels SET min_diamonds = ?, min_hosts = ?, pct = ? WHERE level = ?', [n(l.min_diamonds), n(l.min_hosts), n(l.pct), n(l.level)]);
  }
  await audit(req.admin.id, 'agency_levels', null, req.body.levels);
  res.json({ ok: true });
});
r.post('/agency-levels/recalc', superOnly, async (_req, res) => { await recalcLevels(); res.json({ ok: true }); });

r.get('/settlements', finance, async (_req, res) => {
  res.json(await db.all('SELECT s.*, a.name AS agency_name, a.code FROM agency_settlements s JOIN agencies a ON a.id = s.agency_id ORDER BY s.period_start DESC, a.name LIMIT 300'));
});
r.post('/settlements/run', finance, async (req, res) => {
  const p = req.body.start && req.body.end ? { start: n(req.body.start), end: n(req.body.end) } : lastWeek();
  const ids = await runSettlements(p.start, p.end);
  await audit(req.admin.id, 'settlements_run', null, { ...p, created: ids.length });
  res.json({ created: ids.length, period: p });
});
r.post('/settlements/:id/pay', finance, async (req, res) => {
  const ok = await paySettlement(req.params.id);
  if (!ok) throw bad('not_pending', 'Settlement is not pending');
  await audit(req.admin.id, 'settlement_paid', req.params.id);
  res.json({ ok: true });
});

// ---------- reports ----------
r.get('/reports', mod, async (req, res) => {
  const rows = await db.all(`SELECT rp.*, u.name AS reporter_name FROM reports rp JOIN users u ON u.id = rp.reporter_id WHERE rp.status = ? ORDER BY rp.created_at DESC LIMIT 200`, [req.query.status || 'open']);
  for (const x of rows) {
    if (x.target_type === 'user') x.target = publicUser(await db.one('SELECT * FROM users WHERE id = ?', [x.target_id]));
    if (x.target_type === 'room') x.target = await db.one('SELECT id, title, status, host_id FROM rooms WHERE id = ?', [x.target_id]);
  }
  res.json(rows);
});
r.post('/reports/:id/resolve', mod, async (req, res) => {
  await db.q("UPDATE reports SET status = 'closed', action = ? WHERE id = ?", [String(req.body.action || 'dismissed'), req.params.id]);
  await audit(req.admin.id, 'report_resolved', req.params.id, req.body);
  res.json({ ok: true });
});

// ---------- settings, admins, audit ----------
r.get('/settings', any, async (_req, res) => res.json({ values: await settings(), defaults: DEFAULT_SETTINGS }));
r.put('/settings', superOnly, async (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    await db.q('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', [k, String(v)]);
  }
  clearSettingsCache();
  await audit(req.admin.id, 'settings', null, req.body);
  res.json({ values: await settings() });
});
r.get('/admins', superOnly, async (_req, res) => res.json(await db.all('SELECT id, email, name, role, agency_id, created_at FROM admin_users ORDER BY created_at')));
r.post('/admins', superOnly, async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!['super', 'finance', 'moderator', 'support'].includes(role)) throw bad('bad_role');
  if (!email || String(password || '').length < 8) throw bad('bad_login', 'Email and an 8+ character password are required');
  await db.q('INSERT INTO admin_users (id, email, password_hash, name, role, created_at) VALUES (?,?,?,?,?,?)', [uid(), String(email).toLowerCase(), hashPassword(password), name || email, role, now()]);
  await audit(req.admin.id, 'admin_created', email, { role });
  res.json({ ok: true });
});
r.delete('/admins/:id', superOnly, async (req, res) => {
  if (req.params.id === req.admin.id) throw bad('cannot_delete_self', 'You cannot delete your own admin account');
  await db.q('DELETE FROM admin_users WHERE id = ?', [req.params.id]);
  await audit(req.admin.id, 'admin_deleted', req.params.id);
  res.json({ ok: true });
});
r.get('/audit', superOnly, async (_req, res) => res.json(await db.all('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 300')));
r.post('/upload', any, upload.single('file'), async (req, res) => {
  if (!req.file) throw bad('no_file', 'File type not allowed');
  res.json({ url: fileUrl(req.file) });
});

export default r;
