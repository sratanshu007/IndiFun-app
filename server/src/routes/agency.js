import { Router } from 'express';
import { db, now, uid } from '../db.js';
import { userAuth, adminAuth, bad, notFound, forbidden, publicUser, cleanText, today } from '../lib.js';
import { emitUser } from '../realtime.js';
import { agencyHostDiamonds, levelPct } from '../agencyLogic.js';

const DAY = 864e5;

// ================= app side (hosts and agency owners) =================
export const agencyApp = Router();
agencyApp.use(userAuth);

agencyApp.post('/agency/apply', async (req, res) => {
  const { name, city, phone } = req.body;
  if (!name || String(name).trim().length < 3) throw bad('bad_name', 'Agency name is required');
  const ex = await db.one('SELECT id FROM agencies WHERE owner_user_id = ?', [req.user.id]);
  if (ex) throw bad('exists', 'You already have an agency application');
  let code;
  do code = String(100000 + Math.floor(Math.random() * 900000));
  while (await db.one('SELECT 1 AS x FROM agencies WHERE code = ?', [code]));
  await db.q('INSERT INTO agencies (id, name, code, owner_user_id, status, city, phone, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [uid(), cleanText(name).slice(0, 40), code, req.user.id, 'pending', cleanText(city || '').slice(0, 40), String(phone || '').slice(0, 15), now()]);
  res.json({ ok: true, status: 'pending' });
});

async function currentAgency(hostId) {
  return db.one("SELECT * FROM agency_hosts WHERE host_id = ? AND status = 'active'", [hostId]);
}

agencyApp.post('/agency/join', async (req, res) => {
  if (!req.user.is_host) throw bad('not_host', 'Become a host first');
  const a = await db.one("SELECT * FROM agencies WHERE code = ? AND status = 'active'", [String(req.body.code || '').trim()]);
  if (!a) throw notFound('Agency code not found');
  const cur = await currentAgency(req.user.id);
  if (cur) throw bad('in_agency', 'You are already in an agency. Leave it first (allowed 30 days after joining).');
  await db.q('INSERT INTO agency_hosts (id, agency_id, host_id, status, joined_at, created_at) VALUES (?,?,?,?,?,?)',
    [uid(), a.id, req.user.id, 'active', now(), now()]);
  emitUser(a.owner_user_id, 'notify', { type: 'agency', text: `${req.user.name} joined your agency` });
  res.json({ ok: true, agency: { id: a.id, name: a.name } });
});

agencyApp.post('/agency/leave', async (req, res) => {
  const cur = await currentAgency(req.user.id);
  if (!cur) throw bad('no_agency', 'You are not in an agency');
  if (now() - Number(cur.joined_at) < 30 * DAY) throw bad('locked', 'You can leave 30 days after joining');
  await db.q("UPDATE agency_hosts SET status = 'left', left_at = ? WHERE id = ?", [now(), cur.id]);
  res.json({ ok: true });
});

agencyApp.get('/agency/invites', async (req, res) => {
  res.json(await db.all(`SELECT ah.id, a.name, a.code FROM agency_hosts ah JOIN agencies a ON a.id = ah.agency_id
                         WHERE ah.host_id = ? AND ah.status = 'invited'`, [req.user.id]));
});

agencyApp.post('/agency/invites/:id/:action', async (req, res) => {
  const inv = await db.one("SELECT * FROM agency_hosts WHERE id = ? AND host_id = ? AND status = 'invited'", [req.params.id, req.user.id]);
  if (!inv) throw notFound('Invite not found');
  if (req.params.action === 'accept') {
    if (await currentAgency(req.user.id)) throw bad('in_agency', 'Leave your current agency first');
    await db.q("UPDATE agency_hosts SET status = 'active', joined_at = ? WHERE id = ?", [now(), inv.id]);
  } else {
    await db.q("UPDATE agency_hosts SET status = 'declined' WHERE id = ?", [inv.id]);
  }
  res.json({ ok: true });
});

// ================= agency panel (web, admin token with role "agency") =================
export const agencyPanel = Router();
agencyPanel.use(adminAuth('agency'));

async function panelAgency(req) {
  const id = req.admin.role === 'agency' ? req.admin.agencyId : req.query.agencyId;
  const a = id && await db.one('SELECT * FROM agencies WHERE id = ?', [id]);
  if (!a) throw forbidden('No agency linked to this login');
  return a;
}

agencyPanel.get('/dashboard', async (req, res) => {
  const a = await panelAgency(req);
  const t = now();
  const [d1, d7, d30] = await Promise.all([1, 7, 30].map((d) => agencyHostDiamonds(a, t - d * DAY, t)));
  const hosts = await db.one("SELECT COUNT(*) AS n FROM agency_hosts WHERE agency_id = ? AND status = 'active'", [a.id]);
  const live = await db.one(`SELECT COUNT(*) AS n FROM rooms r JOIN agency_hosts ah ON ah.host_id = r.host_id AND ah.agency_id = ? AND ah.status = 'active' WHERE r.status = 'live'`, [a.id]);
  const pct = await levelPct(a.level);
  const levels = await db.all('SELECT * FROM agency_levels ORDER BY level');
  const next = levels.find((l) => l.level === a.level + 1);
  const chart = await db.all(`SELECT hd.day, SUM(hd.diamonds) AS diamonds, SUM(hd.live_seconds) AS secs FROM host_daily hd
    JOIN agency_hosts ah ON ah.host_id = hd.host_id AND ah.agency_id = ? AND ah.status = 'active'
    WHERE hd.day >= ? GROUP BY hd.day ORDER BY hd.day`, [a.id, today(t - 29 * DAY)]);
  res.json({
    agency: { id: a.id, name: a.name, code: a.code, level: a.level, status: a.status, settlementMode: a.settlement_mode },
    diamonds: { today: d1.total, week: d7.total, month: d30.total },
    commission: { pct, weekEstimate: Math.floor((d7.total * pct) / 100) + d7.bonus },
    hosts: Number(hosts.n), liveNow: Number(live.n),
    nextLevel: next ? { level: next.level, minDiamonds: Number(next.min_diamonds), minHosts: next.min_hosts, pct: Number(next.pct) } : null,
    chart: chart.map((c) => ({ day: c.day, diamonds: Number(c.diamonds), hours: Math.round(Number(c.secs) / 360) / 10 })),
  });
});

agencyPanel.get('/hosts', async (req, res) => {
  const a = await panelAgency(req);
  const since = today(now() - 30 * DAY);
  const rows = await db.all(`SELECT u.*, ah.status AS ah_status, ah.joined_at,
      (SELECT COALESCE(SUM(live_seconds),0) FROM host_daily WHERE host_id = u.id AND day >= ?) AS secs30,
      (SELECT COALESCE(SUM(diamonds),0) FROM host_daily WHERE host_id = u.id AND day >= ?) AS dia30,
      (SELECT COUNT(*) FROM host_daily WHERE host_id = u.id AND day >= ? AND live_seconds >= 3600) AS valid_days,
      (SELECT MAX(started_at) FROM rooms WHERE host_id = u.id) AS last_live,
      (SELECT id FROM rooms WHERE host_id = u.id AND status = 'live') AS live_room
    FROM agency_hosts ah JOIN users u ON u.id = ah.host_id
    WHERE ah.agency_id = ? AND ah.status IN ('active','invited') ORDER BY dia30 DESC`, [since, since, since, a.id]);
  res.json(rows.map((u) => ({
    ...publicUser(u), status: u.ah_status, joinedAt: u.joined_at, hours30: Math.round(Number(u.secs30) / 360) / 10,
    diamonds30: Number(u.dia30), validDays: Number(u.valid_days), lastLive: u.last_live, liveRoom: u.live_room,
  })));
});

agencyPanel.get('/hosts/:id', async (req, res) => {
  const a = await panelAgency(req);
  const link = await db.one('SELECT * FROM agency_hosts WHERE agency_id = ? AND host_id = ?', [a.id, req.params.id]);
  if (!link) throw notFound();
  const u = await db.one('SELECT * FROM users WHERE id = ?', [req.params.id]);
  const daily = await db.all('SELECT day, live_seconds, diamonds FROM host_daily WHERE host_id = ? ORDER BY day DESC LIMIT 30', [u.id]);
  res.json({ user: publicUser(u), joinedAt: link.joined_at, daily: daily.map((d) => ({ day: d.day, hours: Math.round(Number(d.live_seconds) / 360) / 10, diamonds: Number(d.diamonds) })) });
});

agencyPanel.post('/invite', async (req, res) => {
  const a = await panelAgency(req);
  const u = await db.one('SELECT * FROM users WHERE public_id = ?', [String(req.body.publicId || '').trim()]);
  if (!u) throw notFound('No user with that ID');
  const ex = await db.one("SELECT 1 AS x FROM agency_hosts WHERE agency_id = ? AND host_id = ? AND status IN ('active','invited')", [a.id, u.id]);
  if (ex) throw bad('exists', 'Already invited or in your agency');
  await db.q('INSERT INTO agency_hosts (id, agency_id, host_id, status, created_at) VALUES (?,?,?,?,?)', [uid(), a.id, u.id, 'invited', now()]);
  emitUser(u.id, 'notify', { type: 'agency_invite', text: `${a.name} invited you to join their agency` });
  res.json({ ok: true });
});

agencyPanel.delete('/hosts/:id', async (req, res) => {
  const a = await panelAgency(req);
  await db.q("UPDATE agency_hosts SET status = 'left', left_at = ? WHERE agency_id = ? AND host_id = ? AND status IN ('active','invited')", [now(), a.id, req.params.id]);
  res.json({ ok: true });
});

agencyPanel.get('/settlements', async (req, res) => {
  const a = await panelAgency(req);
  res.json(await db.all('SELECT * FROM agency_settlements WHERE agency_id = ? ORDER BY period_start DESC LIMIT 52', [a.id]));
});
