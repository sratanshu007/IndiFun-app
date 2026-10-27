import { Router } from 'express';
import { db, now, uid } from '../db.js';
import { userAuth, bad, notFound, publicUser, wallet, cleanText } from '../lib.js';
import { country, countries, LANGUAGES } from '../world.js';
import { upload, fileUrl } from '../upload.js';
import { emitUser, userCard } from '../realtime.js';

const r = Router();
r.use(userAuth);

r.get('/me', async (req, res) => {
  const u = req.user;
  const [followers, following, agency] = await Promise.all([
    db.one('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?', [u.id]),
    db.one('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?', [u.id]),
    db.one(`SELECT a.id, a.name, a.code, ah.status FROM agency_hosts ah JOIN agencies a ON a.id = ah.agency_id
            WHERE ah.host_id = ? AND ah.status IN ('pending','active') ORDER BY ah.created_at DESC`, [u.id]),
  ]);
  const owned = await db.one('SELECT id, name, code, status, level FROM agencies WHERE owner_user_id = ?', [u.id]);
  res.json({
    user: { ...(await userCard(u.id)), phone: u.phone, dob: u.dob, language: u.language, hostStatus: u.host_status, vipExpiry: u.vip_expiry, country: u.country || 'IN' },
    country: await (async () => { const c = await country(u.country); return { code: c.code, name: c.name, currency: c.currency, symbol: c.symbol, coinsPerUnit: c.coins_per_unit, region: c.region }; })(),
    wallet: await wallet(u.id),
    followers: Number(followers.n), following: Number(following.n),
    agency, ownedAgency: owned,
  });
});

r.put('/me', async (req, res) => {
  const { name, gender, dob, bio, language } = req.body;
  if (language !== undefined && !LANGUAGES.includes(language) && !['fr', 'es', 'pt'].includes(language)) throw bad('bad_language', 'Unknown language');
  let cc = req.user.country || 'IN';
  if (req.body.country !== undefined) {
    const found = (await countries()).find((c) => c.code === req.body.country && c.active);
    if (!found) throw bad('bad_country', 'Choose your country');
    cc = found.code;
  }
  if (name !== undefined && (String(name).trim().length < 2 || String(name).length > 24)) throw bad('bad_name', 'Name must be 2-24 characters');
  if (dob) {
    const age = (now() - Date.parse(dob)) / (365.25 * 864e5);
    if (!(age >= 18)) throw bad('underage', 'You must be 18 or older to use this app');
  }
  const u = req.user;
  await db.q('UPDATE users SET name = ?, gender = ?, dob = ?, bio = ?, language = ?, country = ? WHERE id = ?', [
    name !== undefined ? cleanText(name) : u.name, gender ?? u.gender, dob ?? u.dob,
    bio !== undefined ? cleanText(bio).slice(0, 120) : u.bio, language ?? u.language, cc, u.id,
  ]);
  res.json({ ok: true });
});

r.post('/me/avatar', upload.single('file'), async (req, res) => {
  if (!req.file) throw bad('no_file', 'Upload an image');
  await db.q('UPDATE users SET avatar = ? WHERE id = ?', [fileUrl(req.file), req.user.id]);
  res.json({ avatar: fileUrl(req.file) });
});

r.get('/users/:id', async (req, res) => {
  const u = await db.one('SELECT * FROM users WHERE id = ? OR public_id = ?', [req.params.id, req.params.id]);
  if (!u) throw notFound('User not found');
  const [followers, following, isFollowing, live, gifts] = await Promise.all([
    db.one('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?', [u.id]),
    db.one('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?', [u.id]),
    db.one('SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?', [req.user.id, u.id]),
    db.one("SELECT id, type, title FROM rooms WHERE host_id = ? AND status = 'live'", [u.id]),
    db.all(`SELECT g.id, g.name, g.icon, SUM(t.qty) AS qty FROM gift_tx t JOIN gifts g ON g.id = t.gift_id
            WHERE t.receiver_id = ? GROUP BY g.id, g.name, g.icon ORDER BY qty DESC LIMIT 12`, [u.id]),
  ]);
  res.json({
    user: await userCard(u.id), followers: Number(followers.n), following: Number(following.n),
    isFollowing: !!isFollowing, live, giftWall: gifts.map((g) => ({ ...g, qty: Number(g.qty) })),
  });
});

r.post('/users/:id/follow', async (req, res) => {
  if (req.params.id === req.user.id) throw bad('self', 'You cannot follow yourself');
  const u = await db.one('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!u) throw notFound();
  const ex = await db.one('SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?', [req.user.id, u.id]);
  if (!ex) {
    await db.q('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?,?,?)', [req.user.id, u.id, now()]);
    emitUser(u.id, 'notify', { type: 'follow', text: `${req.user.name} started following you` });
  }
  res.json({ following: true });
});
r.delete('/users/:id/follow', async (req, res) => {
  await db.q('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [req.user.id, req.params.id]);
  res.json({ following: false });
});
r.get('/me/follows', async (req, res) => {
  const col = req.query.type === 'followers' ? ['follower_id', 'followee_id'] : ['followee_id', 'follower_id'];
  const rows = await db.all(`SELECT u.* FROM follows f JOIN users u ON u.id = f.${col[0]} WHERE f.${col[1]} = ? ORDER BY f.created_at DESC LIMIT 200`, [req.user.id]);
  res.json(rows.map((u) => publicUser(u)));
});

// ---- private messages ----
r.get('/conversations', async (req, res) => {
  const me = req.user.id;
  const rows = await db.all(
    `SELECT m.* FROM messages m WHERE m.from_id = ? OR m.to_id = ? ORDER BY m.created_at DESC LIMIT 500`, [me, me]);
  const seen = new Map();
  for (const m of rows) {
    const other = m.from_id === me ? m.to_id : m.from_id;
    if (!seen.has(other)) seen.set(other, { last: m, unread: 0 });
    if (m.to_id === me && !m.read_at) seen.get(other).unread++;
  }
  const out = [];
  for (const [other, v] of seen) {
    const u = await db.one('SELECT * FROM users WHERE id = ?', [other]);
    out.push({ user: publicUser(u), last: { body: v.last.body, at: v.last.created_at, mine: v.last.from_id === me }, unread: v.unread });
  }
  res.json(out);
});
r.get('/messages/:userId', async (req, res) => {
  const me = req.user.id, other = req.params.userId;
  const rows = await db.all(
    `SELECT * FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at DESC LIMIT 100`,
    [me, other, other, me]);
  await db.q('UPDATE messages SET read_at = ? WHERE from_id = ? AND to_id = ? AND read_at IS NULL', [now(), other, me]);
  res.json(rows.reverse().map((m) => ({ id: m.id, body: m.body, at: m.created_at, mine: m.from_id === me })));
});
r.post('/messages', async (req, res) => {
  const to = await db.one('SELECT id FROM users WHERE id = ?', [req.body.to]);
  if (!to) throw notFound();
  const body = cleanText(req.body.body);
  if (!body) throw bad('empty', 'Message is empty');
  const m = { id: uid(), from_id: req.user.id, to_id: to.id, body, created_at: now() };
  await db.q('INSERT INTO messages (id, from_id, to_id, body, created_at) VALUES (?,?,?,?,?)', [m.id, m.from_id, m.to_id, m.body, m.created_at]);
  emitUser(to.id, 'dm', { from: publicUser(req.user), id: m.id, body, at: m.created_at });
  res.json({ id: m.id, body, at: m.created_at, mine: true });
});

// ---- safety ----
r.post('/report', async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (!['user', 'room', 'message'].includes(targetType) || !targetId || !reason) throw bad('bad_report', 'Choose what to report and why');
  await db.q('INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES (?,?,?,?,?,?,?)',
    [uid(), req.user.id, targetType, String(targetId), String(reason).slice(0, 300), 'open', now()]);
  res.json({ ok: true });
});

// ---- discovery ----
r.get('/banners', async (_req, res) => res.json(await db.all('SELECT * FROM banners WHERE active = 1 ORDER BY sort')));

r.get('/rank', async (req, res) => {
  const period = { day: 864e5, week: 7 * 864e5, month: 30 * 864e5 }[req.query.period] || 864e5;
  const since = now() - period;
  const col = req.query.type === 'gifters' ? 'sender_id' : 'receiver_id';
  const local = req.query.scope === 'country';
  const rows = await db.all(
    `SELECT t.${col} AS uid, SUM(t.coins) AS score FROM gift_tx t ${local ? 'JOIN users u ON u.id = t.' + col + ' AND u.country = ?' : ''}
     WHERE t.created_at > ? GROUP BY t.${col} ORDER BY score DESC LIMIT 50`, local ? [req.user.country || 'IN', since] : [since]);
  const out = [];
  for (const row of rows) out.push({ user: publicUser(await db.one('SELECT * FROM users WHERE id = ?', [row.uid])), score: Number(row.score) });
  res.json(out);
});

r.get('/search', async (req, res) => {
  const qs = String(req.query.q || '').trim();
  if (!qs) return res.json([]);
  const rows = await db.all('SELECT * FROM users WHERE public_id = ? OR LOWER(name) LIKE ? LIMIT 30', [qs, `%${qs.toLowerCase()}%`]);
  res.json(rows.map((u) => publicUser(u)));
});

export default r;
