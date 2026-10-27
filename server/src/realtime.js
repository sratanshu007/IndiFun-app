// Socket.IO realtime layer: room presence, chat, likes, audio seats, and broadcast helpers.
import { Server } from 'socket.io';
import { config } from './config.js';
import { db, now, uid } from './db.js';
import { verifyToken, cleanText, publicUser, num, setting, hasBadWords } from './lib.js';
import { detectLang } from './world.js';
import { aiOn, checkChat } from './ai.js';

let io;
const rooms = new Map(); // roomId -> live state kept in memory

export async function userCard(userId) {
  const u = await db.one('SELECT * FROM users WHERE id = ?', [userId]);
  if (!u) return null;
  const items = await db.all(
    `SELECT s.type, s.name, s.anim_url, s.anim_type FROM user_items ui JOIN store_items s ON s.id = ui.item_id
     WHERE ui.user_id = ? AND ui.equipped = 1 AND ui.expires_at > ?`, [userId, now()]);
  const pick = (t) => {
    const i = items.find((x) => x.type === t);
    return i ? { name: i.name, url: i.anim_url, type: i.anim_type } : null;
  };
  return { ...publicUser(u), entry: pick('entry'), frame: pick('frame'), bubble: pick('bubble') };
}

export function roomState(roomId) {
  return rooms.get(roomId);
}

export async function ensureRoom(room) {
  if (!rooms.has(room.id)) {
    const seatsN = room.type === 'audio' ? await num('max_audio_seats') : 0;
    rooms.set(room.id, {
      id: room.id, hostId: room.host_id, type: room.type,
      viewers: new Map(), chat: [], likes: 0, likesPending: 0,
      seats: Array.from({ length: seatsN }, (_, i) => ({ no: i + 1, user: null, muted: false, locked: false })),
      muted: new Set(), kicked: new Set(), pkId: null, contrib: new Map(), strikes: new Map(),
    });
  }
  return rooms.get(room.id);
}

export const emitRoom = (roomId, ev, data) => io?.to(`r:${roomId}`).emit(ev, data);
export const emitAll = (ev, data) => io?.emit(ev, data);
export const emitUser = (userId, ev, data) => io?.to(`u:${userId}`).emit(ev, data);

export function closeRoom(roomId, reason = 'ended') {
  emitRoom(roomId, 'room:closed', { roomId, reason });
  io?.in(`r:${roomId}`).socketsLeave(`r:${roomId}`);
  rooms.delete(roomId);
}

export function addContribution(roomId, user, coins) {
  const st = rooms.get(roomId);
  if (!st) return [];
  const cur = st.contrib.get(user.id) || { user, coins: 0 };
  cur.coins += coins;
  st.contrib.set(user.id, cur);
  return topContrib(st);
}
const topContrib = (st) => [...st.contrib.values()].sort((a, b) => b.coins - a.coins).slice(0, 10);

function viewerList(st) {
  return [...st.viewers.values()].sort((a, b) => (b.vip - a.vip) || (b.level - a.level)).slice(0, 30);
}

async function persistViewers(roomId, st) {
  const n = st.viewers.size;
  await db.q('UPDATE rooms SET viewers = ?, peak = CASE WHEN peak < ? THEN ? ELSE peak END WHERE id = ?', [n, n, n, roomId]);
}

function leave(socket, roomId) {
  const st = rooms.get(roomId);
  socket.leave(`r:${roomId}`);
  if (!st) return;
  const u = socket.data.user;
  if (st.hostSocketId === socket.id) {
    st.hostSocketId = null;
    emitRoom(roomId, 'webrtc:host_left');
  } else if (st.hostSocketId) {
    io?.to(st.hostSocketId).emit('webrtc:peer_left', { peerId: socket.id });
  }
  // Only remove the viewer if no other socket of the same user is still in the room.
  const still = [...(io.sockets.adapter.rooms.get(`r:${roomId}`) || [])].some((sid) => io.sockets.sockets.get(sid)?.data.user?.id === u.id);
  if (still) return;
  st.viewers.delete(u.id);
  for (const s of st.seats) if (s.user?.id === u.id) s.user = null;
  emitRoom(roomId, 'user_left', { userId: u.id, viewers: st.viewers.size });
  emitRoom(roomId, 'seats', st.seats);
  persistViewers(roomId, st).catch(() => { });
}

export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') } });

  io.use(async (socket, next) => {
    try {
      const p = verifyToken(socket.handshake.auth?.token);
      if (p.kind !== 'user') return next(new Error('unauthorized'));
      const card = await userCard(p.sub);
      if (!card) return next(new Error('unauthorized'));
      socket.data.user = card;
      socket.data.lastChat = 0;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const me = () => socket.data.user;
    socket.join(`u:${me().id}`);

    socket.on('room:join', async ({ roomId } = {}, ack) => {
      try {
        const room = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live'", [roomId]);
        if (!room) return ack?.({ error: 'Room has ended' });
        const st = await ensureRoom(room);
        if (st.kicked.has(me().id)) return ack?.({ error: 'You were removed from this room' });
        socket.data.user = await userCard(me().id); // refresh equipped items
        socket.join(`r:${roomId}`);
        const isNew = !st.viewers.has(me().id);
        st.viewers.set(me().id, me());
        if (isNew && me().id !== st.hostId) {
          emitRoom(roomId, 'user_joined', { user: me(), viewers: st.viewers.size });
        }
        persistViewers(roomId, st).catch(() => { });
        let pk = null;
        if (st.pkId) pk = await db.one('SELECT * FROM pk_battles WHERE id = ?', [st.pkId]);
        ack?.({
          ok: true,
          state: {
            chat: st.chat.slice(-50), seats: st.seats, viewers: st.viewers.size, viewerList: viewerList(st),
            likes: st.likes, top: topContrib(st), pk,
          },
        });
      } catch (e) {
        ack?.({ error: e.message });
      }
    });

    socket.on('room:leave', ({ roomId } = {}) => leave(socket, roomId));

    socket.on('chat:send', ({ roomId, text } = {}, ack) => {
      const st = rooms.get(roomId);
      if (!st || !socket.rooms.has(`r:${roomId}`)) return ack?.({ error: 'Not in room' });
      if (st.muted.has(me().id)) return ack?.({ error: 'You are muted in this room' });
      const t = now();
      if (t - socket.data.lastChat < 800) return ack?.({ error: 'Slow down' });
      socket.data.lastChat = t;
      const clean = cleanText(text);
      if (!clean) return ack?.({ error: 'Empty' });
      if (hasBadWords(text)) strike(roomId, st, me(), 'abusive words').catch(() => { });
      const msg = { id: `${t}-${Math.random().toString(36).slice(2, 7)}`, user: me(), text: clean, at: t, lang: detectLang(clean) };
      st.chat.push(msg);
      if (st.chat.length > 100) st.chat.shift();
      emitRoom(roomId, 'chat', msg);
      queueAiChat(roomId, msg);
      ack?.({ ok: true });
    });

    socket.on('like', ({ roomId, n = 1 } = {}) => {
      const st = rooms.get(roomId);
      if (!st) return;
      st.likesPending += Math.min(20, Math.max(1, Number(n) || 1));
    });

    // ---- audio room seats ----
    const isHost = (st) => st && st.hostId === me().id;
    socket.on('seat:take', ({ roomId, no } = {}, ack) => {
      const st = rooms.get(roomId);
      const seat = st?.seats.find((s) => s.no === no);
      if (!seat || seat.user || seat.locked) return ack?.({ error: 'Seat not available' });
      for (const s of st.seats) if (s.user?.id === me().id) s.user = null;
      seat.user = me();
      emitRoom(roomId, 'seats', st.seats);
      ack?.({ ok: true });
    });
    socket.on('seat:leave', ({ roomId } = {}) => {
      const st = rooms.get(roomId);
      if (!st) return;
      for (const s of st.seats) if (s.user?.id === me().id) s.user = null;
      emitRoom(roomId, 'seats', st.seats);
    });
    socket.on('seat:admin', ({ roomId, no, action } = {}) => {
      const st = rooms.get(roomId);
      if (!isHost(st)) return;
      const seat = st.seats.find((s) => s.no === no);
      if (!seat) return;
      if (action === 'lock') seat.locked = !seat.locked;
      if (action === 'mute') seat.muted = !seat.muted;
      if (action === 'kick') seat.user = null;
      emitRoom(roomId, 'seats', st.seats);
    });

    // ---- host moderation ----
    socket.on('host:mute', ({ roomId, userId } = {}) => {
      const st = rooms.get(roomId);
      if (!isHost(st)) return;
      st.muted.has(userId) ? st.muted.delete(userId) : st.muted.add(userId);
      emitRoom(roomId, 'system', { text: st.muted.has(userId) ? 'A user was muted by the host' : 'A user was unmuted' });
    });
    socket.on('host:kick', ({ roomId, userId } = {}) => {
      const st = rooms.get(roomId);
      if (!isHost(st) || userId === st.hostId) return;
      st.kicked.add(userId);
      emitUser(userId, 'kicked', { roomId });
      for (const [, s] of io.sockets.sockets) if (s.data.user?.id === userId) leave(s, roomId);
    });

    // ---- WebRTC peer-to-peer live streaming signaling ----
    socket.on('webrtc:join', ({ roomId, isHost } = {}) => {
      const st = rooms.get(roomId);
      if (!st) return;
      if (isHost) {
        st.hostSocketId = socket.id;
        socket.to(`r:${roomId}`).emit('webrtc:host_ready', { hostSocketId: socket.id });
      } else {
        if (st.hostSocketId) {
          io.to(st.hostSocketId).emit('webrtc:viewer_joined', { viewerSocketId: socket.id, user: me() });
        }
      }
    });

    socket.on('webrtc:signal', ({ to, data } = {}) => {
      if (to && data) {
        io.to(to).emit('webrtc:signal', { from: socket.id, data });
      }
    });

    socket.on('webrtc:ice', ({ to, candidate } = {}) => {
      if (to && candidate) {
        io.to(to).emit('webrtc:ice', { from: socket.id, candidate });
      }
    });

    socket.on('disconnecting', () => {
      for (const r of socket.rooms) if (r.startsWith('r:')) leave(socket, r.slice(2));
    });
  });

  // Flush batched likes once a second.
  setInterval(() => {
    for (const [roomId, st] of rooms) {
      if (!st.likesPending) continue;
      const n = st.likesPending;
      st.likesPending = 0;
      st.likes += n;
      emitRoom(roomId, 'likes', { added: n, total: st.likes });
      db.q('UPDATE rooms SET likes = likes + ? WHERE id = ?', [n, roomId]).catch(() => { });
    }
  }, 1000);

  return io;
}

// ---------- chat strikes & AI chat moderation ----------
async function strike(roomId, st, user, reason) {
  await db.q('UPDATE users SET strikes = strikes + 1 WHERE id = ?', [user.id]);
  const roomStrikes = (st.strikes.get(user.id) || 0) + 1;
  st.strikes.set(user.id, roomStrikes);
  if (roomStrikes >= (await num('chat_strikes_to_mute')) && !st.muted.has(user.id)) {
    st.muted.add(user.id);
    emitUser(user.id, 'notify', { type: 'mute', text: 'You were muted in this room for breaking chat rules' });
    await db.q('INSERT INTO moderation_events (id, kind, room_id, user_id, severity, detail, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [uid(), 'strike', roomId, user.id, 'medium', `Auto-muted after ${roomStrikes} strikes (${reason})`, 'open', now()]);
  }
}

const aiQueue = new Map(); // roomId -> [msg]
function queueAiChat(roomId, msg) {
  if (!aiOn()) return;
  if (!aiQueue.has(roomId)) aiQueue.set(roomId, []);
  aiQueue.get(roomId).push(msg);
}
setInterval(async () => {
  if (!aiOn() || !aiQueue.size || (await setting('ai_moderation')) !== '1') { aiQueue.clear(); return; }
  const batch = [...aiQueue.entries()];
  aiQueue.clear();
  for (const [roomId, msgs] of batch) {
    try {
      const v = await checkChat(msgs.map((m) => m.text));
      const st = rooms.get(roomId);
      for (const i of v.remove) {
        const m = msgs[i];
        if (!m) continue;
        if (st) st.chat = st.chat.filter((x) => x.id !== m.id);
        emitRoom(roomId, 'chat:remove', { id: m.id });
        await db.q('INSERT INTO moderation_events (id, kind, room_id, user_id, severity, detail, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
          [uid(), 'ai_chat', roomId, m.user.id, 'low', JSON.stringify({ text: m.text, reason: v.reasons?.[i] || v.reasons?.[String(i)] }), 'open', now()]);
        if (st) await strike(roomId, st, m.user, v.reasons?.[i] || 'ai');
      }
    } catch (e) { console.error('ai chat', e.message); }
  }
}, 2500);

// ---------- live checks ----------
const pendingChecks = new Map(); // checkId -> { roomId, hostId, at }
const PROMPTS = ['Tap to confirm you are live', 'Still there? Tap the button', 'Quick check: tap to keep your live on'];
export async function runLiveChecks() {
  const mins = await num('live_check_minutes');
  if (!(mins > 0)) return;
  const t = now();
  // 1. expire unanswered checks
  for (const [id, c] of pendingChecks) {
    if (t - c.at < 60e3) continue;
    pendingChecks.delete(id);
    const room = await db.one("SELECT * FROM rooms WHERE id = ? AND status = 'live'", [c.roomId]);
    if (!room) continue;
    const missed = Number(room.checks_missed || 0) + 1;
    await db.q('UPDATE rooms SET checks_missed = ? WHERE id = ?', [missed, room.id]);
    await db.q('INSERT INTO moderation_events (id, kind, room_id, user_id, severity, detail, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [uid(), 'live_check', room.id, room.host_id, missed >= 2 ? 'high' : 'low', `Missed live check #${missed}`, 'open', t]);
    if (missed >= 2) {
      const { endRoom } = await import('./routes/live.js');
      await endRoom(room.id, 'live_check_failed');
      emitUser(room.host_id, 'notify', { type: 'livecheck', text: 'Your live was ended because the live check was missed twice' });
    }
  }
  // 2. send a new check to video rooms that are due
  for (const [roomId, st] of rooms) {
    if (st.type !== 'video') continue;
    st.nextCheck ||= t + mins * 60e3 * (0.5 + Math.random() * 0.5);
    if (t < st.nextCheck) continue;
    st.nextCheck = t + mins * 60e3 * (0.75 + Math.random() * 0.5);
    const id = uid();
    pendingChecks.set(id, { roomId, hostId: st.hostId, at: t });
    emitUser(st.hostId, 'livecheck', { id, roomId, text: PROMPTS[Math.floor(Math.random() * PROMPTS.length)], seconds: 60 });
  }
}
