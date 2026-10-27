import { Router } from 'express';
import { db, now, uid } from '../db.js';
import { userAuth, bad, notFound, forbidden, moveMoney, wallet, num, today, publicUser, cleanText, requireAdult, setting } from '../lib.js';
import { country, coinsToLocal, CATEGORIES, LANGUAGES } from '../world.js';
import { checkSpend } from './trust.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ANIMS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'animations', 'dist');
const hasAnim = (url) => !String(url || '').startsWith('/anims/') || fs.existsSync(path.join(ANIMS, String(url).slice(7)));
import { rtcToken } from '../rtc.js';
import { ensureRoom, roomState, emitRoom, emitAll, emitUser, closeRoom, userCard, addContribution } from '../realtime.js';
import { upload, fileUrl } from '../upload.js';

const r = Router();
r.use(userAuth);

async function roomOut(room) {
  const host = await db.one('SELECT * FROM users WHERE id = ?', [room.host_id]);
  const st = roomState(room.id);
  return {
    id: room.id, type: room.type, title: room.title, cover: room.cover || host?.avatar, channel: room.channel,
    viewers: st ? st.viewers.size : Number(room.viewers), diamonds: Number(room.diamonds), likes: Number(room.likes),
    startedAt: room.started_at, host: publicUser(host), inPk: !!st?.pkId,
    category: room.category || 'talk', language: room.language || 'hi', country: room.country || host?.country || 'IN',
  };
}

// ---------- discover ----------
r.get('/live', async (req, res) => {
  const tab = req.query.tab || 'popular';
  const cat = CATEGORIES.includes(req.query.category) ? req.query.category : null;
  const lang = LANGUAGES.includes(req.query.lang) ? req.query.lang : null;
  const near = req.query.near === '1' ? req.user.country || 'IN' : null;
  let rows;
  if (tab === 'following') {
    rows = await db.all(`SELECT r.* FROM rooms r JOIN follows f ON f.followee_id = r.host_id WHERE r.status = 'live' AND f.follower_id = ? ORDER BY r.viewers DESC`, [req.user.id]);
  } else if (tab === 'audio') {
    rows = await db.all("SELECT * FROM rooms WHERE status = 'live' AND type = 'audio' ORDER BY viewers DESC LIMIT 60");
  } else if (tab === 'new') {
    rows = await db.all("SELECT * FROM rooms WHERE status = 'live' ORDER BY started_at DESC LIMIT 60");
  } else {
    rows = await db.all("SELECT * FROM rooms WHERE status = 'live' AND type = 'video' ORDER BY viewers DESC, diamonds DESC LIMIT 60");
  }
  rows = rows.filter((x) => (!cat || x.category === cat) && (!lang || x.language === lang) && (!near || x.country === near));
  res.json(await Promise.all(rows.map(roomOut)));
});

// ---------- go live ----------
r.post('/live/start', upload.single('cover'), async (req, res) => {
  const u = req.user;
  if (u.status === 'banned') throw forbidden('Your account is banned');
  if (u.host_status === 'suspended') throw forbidden('Your host account has been suspended by admin. Please contact support or submit an appeal.');
  if (!u.is_host || !u.verified || u.host_status !== 'approved') {
    throw bad('need_kyc', 'Host verification required. Please submit your Aadhaar / ID and live photo to be verified by admin before going live.');
  }
  requireAdult(u);
  const type = req.body.type === 'audio' ? 'audio' : 'video';
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'talk';
  const language = LANGUAGES.includes(req.body.language) ? req.body.language : (u.language || 'hi');
  const old = await db.all("SELECT id FROM rooms WHERE host_id = ? AND status = 'live'", [u.id]);
  for (const o of old) await endRoom(o.id, 'replaced');
  const id = uid();
  const channel = `room_${id.slice(0, 8)}`;
  const t = now();
  await db.q('INSERT INTO rooms (id, host_id, type, title, cover, channel, status, started_at, last_beat, category, language, country) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, u.id, type, cleanText(req.body.title || `${u.name}'s live`).slice(0, 60), fileUrl(req.file), channel, 'live', t, t, category, language, u.country || 'IN']);
  const room = await db.one('SELECT * FROM rooms WHERE id = ?', [id]);
  await ensureRoom(room);
  // Tell followers.
  const fans = await db.all('SELECT follower_id FROM follows WHERE followee_id = ?', [u.id]);
  for (const f of fans) emitUser(f.follower_id, 'notify', { type: 'live', roomId: id, text: `${u.name} is live now` });
  res.json({ room: await roomOut(room), rtc: rtcToken(channel, u.public_id, true, u.name), snapshotSec: await num('snapshot_sec') });
});

r.post('/live/:id/join', async (req, res) => {
  const room = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live'", [req.params.id]);
  if (!room) throw notFound('This live has ended');
  const isHost = room.host_id === req.user.id;
  const following = await db.one('SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?', [req.user.id, room.host_id]);
  res.json({
    snapshotSec: isHost ? await num('snapshot_sec') : 0,
    room: await roomOut(room), isHost, following: !!following, hostCard: await userCard(room.host_id),
    rtc: rtcToken(room.channel, req.user.public_id, isHost || room.type === 'audio', req.user.name),
  });
});

// Token to watch another room's channel (used to show the opponent during a PK battle).
r.get('/live/:id/watch-token', async (req, res) => {
  const room = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live'", [req.params.id]);
  if (!room) throw notFound();
  res.json({ rtc: rtcToken(room.channel, Number(req.user.public_id) + 500000000, false, req.user.name), hostPublicId: Number((await db.one('SELECT public_id FROM users WHERE id = ?', [room.host_id])).public_id) });
});

r.post('/live/:id/heartbeat', async (req, res) => {
  const room = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live' AND host_id = ?", [req.params.id, req.user.id]);
  if (!room) return res.json({ ended: true });
  const t = now();
  const secs = Math.round(Math.min(120, (t - Number(room.last_beat)) / 1000));
  await db.q('UPDATE rooms SET last_beat = ? WHERE id = ?', [t, room.id]);
  await db.q(`INSERT INTO host_daily (host_id, day, live_seconds, diamonds) VALUES (?,?,?,0)
              ON CONFLICT (host_id, day) DO UPDATE SET live_seconds = host_daily.live_seconds + excluded.live_seconds`,
    [req.user.id, today(), secs]);
  res.json({ ok: true });
});

export async function endRoom(roomId, reason = 'ended') {
  const room = await db.one('SELECT * FROM rooms WHERE id = ?', [roomId]);
  if (!room || room.status !== 'live') return null;
  const st = roomState(roomId);
  if (st?.pkId) await endPk(st.pkId);
  await db.q("UPDATE rooms SET status = 'ended', ended_at = ? WHERE id = ?", [now(), roomId]);
  closeRoom(roomId, reason);
  return room;
}

r.post('/live/:id/end', async (req, res) => {
  const room = await db.one('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
  if (!room) throw notFound();
  if (room.host_id !== req.user.id) throw forbidden();
  await endRoom(room.id, 'ended');
  const fresh = await db.one('SELECT * FROM rooms WHERE id = ?', [room.id]);
  const newFans = await db.one('SELECT COUNT(*) AS n FROM follows WHERE followee_id = ? AND created_at >= ?', [room.host_id, room.started_at]);
  res.json({
    summary: {
      durationSec: Math.round((Number(fresh.ended_at) - Number(fresh.started_at)) / 1000), peak: Number(fresh.peak),
      diamonds: Number(fresh.diamonds), likes: Number(fresh.likes), newFans: Number(newFans.n),
    },
  });
});

// ---------- gifts ----------
r.get('/gifts', async (req, res) => {
  const c = await country(req.user.country);
  const rows = (await db.all('SELECT * FROM gifts WHERE active = 1 ORDER BY sort, coins')).filter((g) => hasAnim(g.anim_url));
  // Every gift is available everywhere; gifts tagged for the user's country/region also appear in a "Local" tab.
  res.json(rows.map((g) => {
    const reg = String(g.region || 'all').split(',').map((x) => x.trim());
    return { ...g, local: reg.includes(c.code) || (c.region && reg.includes(c.region)), price: coinsToLocal(g.coins, c).label };
  }));
});

r.post('/gift/send', async (req, res) => {
  const { roomId, giftId, idemKey } = req.body;
  const qty = Math.floor(Number(req.body.qty || 1));
  if (!(qty >= 1 && qty <= 999)) throw bad('bad_qty', 'Invalid quantity');
  const gift = await db.one('SELECT * FROM gifts WHERE id = ? AND active = 1', [giftId]);
  if (!gift) throw notFound('Gift not found');
  const room = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live'", [roomId]);
  if (!room) throw notFound('This live has ended');
  let receiverId = room.host_id;
  const st = roomState(room.id);
  if (req.body.receiverId && req.body.receiverId !== room.host_id) {
    if (!st?.seats.some((s) => s.user?.id === req.body.receiverId)) throw bad('not_on_seat', 'You can gift the host or people on seats');
    receiverId = req.body.receiverId;
  }
  if (receiverId === req.user.id) throw bad('self_gift', 'You cannot send a gift to yourself');
  requireAdult(req.user);
  if (idemKey) {
    const dup = await db.one('SELECT 1 AS x FROM ledger WHERE idem_key = ?', [`gift:${req.user.id}:${idemKey}`]);
    if (dup) return res.json({ ok: true, duplicate: true, wallet: await wallet(req.user.id) });
  }
  const coins = Number(gift.coins) * qty;
  await checkSpend(req.user, coins, !!req.body.confirmed);
  const diamonds = coins; // 1 coin = 1 diamond; money split is applied on withdrawal rate
  const txId = uid();
  let pkRow = null;
  await db.tx(async (q) => {
    await moveMoney(q, { userId: req.user.id, currency: 'coins', amount: -coins, type: 'gift_send', refId: txId, idemKey: idemKey ? `gift:${req.user.id}:${idemKey}` : null, note: `${gift.name} x${qty}` });
    await moveMoney(q, { userId: receiverId, currency: 'diamonds', amount: diamonds, type: 'gift_receive', refId: txId, note: `${gift.name} x${qty}` });
    await q('INSERT INTO gift_tx (id, sender_id, receiver_id, room_id, gift_id, qty, coins, diamonds, pk_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [txId, req.user.id, receiverId, room.id, gift.id, qty, coins, diamonds, st?.pkId || null, now()]);
    await q('UPDATE users SET coins_spent = coins_spent + ? WHERE id = ?', [coins, req.user.id]);
    await q('UPDATE users SET diamonds_earned = diamonds_earned + ? WHERE id = ?', [diamonds, receiverId]);
    await q('UPDATE rooms SET diamonds = diamonds + ? WHERE id = ?', [diamonds, room.id]);
    await q(`INSERT INTO host_daily (host_id, day, live_seconds, diamonds) VALUES (?,?,0,?)
             ON CONFLICT (host_id, day) DO UPDATE SET diamonds = host_daily.diamonds + excluded.diamonds`, [receiverId, today(), diamonds]);
    if (st?.pkId && receiverId === room.host_id) {
      const pk = (await q("SELECT * FROM pk_battles WHERE id = ? AND status = 'active'", [st.pkId])).rows[0];
      if (pk && Number(pk.ends_at) > now()) {
        const col = pk.room_a === room.id ? 'score_a' : 'score_b';
        await q(`UPDATE pk_battles SET ${col} = ${col} + ? WHERE id = ?`, [diamonds, pk.id]);
        pkRow = (await q('SELECT * FROM pk_battles WHERE id = ?', [pk.id])).rows[0];
      }
    }
  });
  const sender = await userCard(req.user.id);
  const receiver = await db.one('SELECT * FROM users WHERE id = ?', [receiverId]);
  const g = { id: gift.id, name: gift.name, icon: gift.icon, animUrl: gift.anim_url, animType: gift.anim_type, tier: gift.tier, coins: Number(gift.coins) };
  emitRoom(room.id, 'gift', { id: txId, gift: g, qty, sender, receiver: publicUser(receiver), combo: req.body.combo || 1 });
  emitRoom(room.id, 'top', addContribution(room.id, sender, coins));
  if (gift.global_banner || coins >= (await num('banner_threshold_coins'))) {
    emitAll('banner', { gift: g, qty, sender: { name: sender.name, avatar: sender.avatar }, receiver: { name: receiver.name }, roomId: room.id });
  }
  if (pkRow) {
    emitRoom(pkRow.room_a, 'pk:update', pkRow);
    emitRoom(pkRow.room_b, 'pk:update', pkRow);
  }
  res.json({ ok: true, wallet: await wallet(req.user.id) });
});

// ---------- PK battles ----------
const pkTimers = new Map();
const randomQueue = new Map(); // roomId -> { hostId, at }

async function startPk(pk) {
  const dur = await num('pk_duration_sec');
  const t = now();
  await db.q("UPDATE pk_battles SET status = 'active', started_at = ?, ends_at = ? WHERE id = ?", [t, t + dur * 1000, pk.id]);
  const row = await db.one('SELECT * FROM pk_battles WHERE id = ?', [pk.id]);
  for (const rid of [row.room_a, row.room_b]) {
    const room = await db.one('SELECT * FROM rooms WHERE id = ?', [rid]);
    const st = await ensureRoom(room);
    st.pkId = row.id;
  }
  const payload = {
    ...row,
    a: { roomId: row.room_a, host: await userCard(row.host_a) },
    b: { roomId: row.room_b, host: await userCard(row.host_b) },
  };
  emitRoom(row.room_a, 'pk:start', payload);
  emitRoom(row.room_b, 'pk:start', payload);
  pkTimers.set(row.id, setTimeout(() => endPk(row.id).catch(console.error), dur * 1000));
  return payload;
}

export async function endPk(pkId) {
  clearTimeout(pkTimers.get(pkId));
  pkTimers.delete(pkId);
  const pk = await db.one('SELECT * FROM pk_battles WHERE id = ?', [pkId]);
  if (!pk || pk.status !== 'active') return;
  const winner = Number(pk.score_a) === Number(pk.score_b) ? 'draw' : Number(pk.score_a) > Number(pk.score_b) ? pk.host_a : pk.host_b;
  await db.q("UPDATE pk_battles SET status = 'ended', winner = ? WHERE id = ?", [winner, pkId]);
  const row = await db.one('SELECT * FROM pk_battles WHERE id = ?', [pkId]);
  for (const rid of [row.room_a, row.room_b]) {
    const st = roomState(rid);
    if (st) st.pkId = null;
    emitRoom(rid, 'pk:end', row);
  }
}

export async function resumePks() {
  const rows = await db.all("SELECT * FROM pk_battles WHERE status = 'active'");
  for (const pk of rows) {
    const left = Number(pk.ends_at) - now();
    if (left <= 0) await endPk(pk.id);
    else pkTimers.set(pk.id, setTimeout(() => endPk(pk.id).catch(console.error), left));
  }
}

async function myLiveRoom(userId, roomId) {
  const room = await db.one("SELECT * FROM rooms WHERE id = ? AND host_id = ? AND status = 'live'", [roomId, userId]);
  if (!room) throw bad('not_live', 'You are not live');
  if (room.type !== 'video') throw bad('video_only', 'PK works in video lives');
  if (roomState(room.id)?.pkId) throw bad('in_pk', 'Already in a PK battle');
  return room;
}

r.get('/pk/opponents', async (req, res) => {
  const rows = await db.all("SELECT * FROM rooms WHERE status = 'live' AND type = 'video' AND host_id <> ? ORDER BY viewers DESC LIMIT 30", [req.user.id]);
  res.json((await Promise.all(rows.map(roomOut))).filter((x) => !x.inPk));
});

r.post('/pk/invite', async (req, res) => {
  const mine = await myLiveRoom(req.user.id, req.body.roomId);
  const target = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live' AND type = 'video'", [req.body.targetRoomId]);
  if (!target || target.host_id === req.user.id) throw notFound('That host is not live');
  if (roomState(target.id)?.pkId) throw bad('busy', 'That host is already in a PK');
  const id = uid();
  await db.q('INSERT INTO pk_battles (id, room_a, room_b, host_a, host_b, status, created_at) VALUES (?,?,?,?,?,?,?)',
    [id, mine.id, target.id, mine.host_id, target.host_id, 'invited', now()]);
  emitUser(target.host_id, 'pk:invite', { pkId: id, from: await userCard(req.user.id), roomId: mine.id });
  setTimeout(() => db.q("UPDATE pk_battles SET status = 'expired' WHERE id = ? AND status = 'invited'", [id]).catch(() => {}), 30e3);
  res.json({ pkId: id });
});

r.post('/pk/:id/accept', async (req, res) => {
  const pk = await db.one("SELECT * FROM pk_battles WHERE id = ? AND status = 'invited'", [req.params.id]);
  if (!pk || pk.host_b !== req.user.id) throw notFound('Invite expired');
  await myLiveRoom(req.user.id, pk.room_b);
  res.json(await startPk(pk));
});

r.post('/pk/:id/reject', async (req, res) => {
  const pk = await db.one("SELECT * FROM pk_battles WHERE id = ? AND status = 'invited'", [req.params.id]);
  if (pk && pk.host_b === req.user.id) {
    await db.q("UPDATE pk_battles SET status = 'rejected' WHERE id = ?", [pk.id]);
    emitUser(pk.host_a, 'pk:rejected', { pkId: pk.id });
  }
  res.json({ ok: true });
});

r.post('/pk/random', async (req, res) => {
  const mine = await myLiveRoom(req.user.id, req.body.roomId);
  for (const [rid, w] of randomQueue) {
    if (rid === mine.id || now() - w.at > 60e3) { randomQueue.delete(rid); continue; }
    const other = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live'", [rid]);
    randomQueue.delete(rid);
    if (!other || roomState(rid)?.pkId) continue;
    const id = uid();
    await db.q('INSERT INTO pk_battles (id, room_a, room_b, host_a, host_b, status, created_at) VALUES (?,?,?,?,?,?,?)',
      [id, other.id, mine.id, other.host_id, mine.host_id, 'invited', now()]);
    return res.json({ matched: true, pk: await startPk({ id }) });
  }
  randomQueue.set(mine.id, { hostId: req.user.id, at: now() });
  res.json({ matched: false, waiting: true });
});

export default r;
