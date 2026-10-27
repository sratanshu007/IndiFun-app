import express from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { initDb, db, now } from './db.js';
import { ApiError, settings } from './lib.js';
import { initRealtime, runLiveChecks } from './realtime.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import walletRoutes from './routes/wallet.js';
import liveRoutes, { endRoom, resumePks } from './routes/live.js';
import { agencyApp, agencyPanel } from './routes/agency.js';
import adminRoutes from './routes/admin.js';
import adminTrust from './routes/adminTrust.js';
import trustRoutes, { publicTrust } from './routes/trust.js';
import { runSettlements, lastWeek, recalcLevels } from './agencyLogic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-secret-change-me') {
  console.error('Set JWT_SECRET in .env before running in production.');
  process.exit(1);
}
await initDb();
const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '1mb' }));

// Simple per-IP rate limit for the API (protects OTP and gift endpoints from abuse).
const hits = new Map();
app.use('/api', (req, res, next) => {
  const key = `${req.ip}:${Math.floor(Date.now() / 10e3)}`;
  const n = (hits.get(key) || 0) + 1;
  hits.set(key, n);
  if (n > 300) return res.status(429).json({ error: 'too_many_requests', message: 'Too many requests, slow down' });
  next();
});
setInterval(() => hits.clear(), 60e3);

app.get('/api/health', (_req, res) => res.json({ ok: true, db: db.kind, time: now() }));
app.get('/api/config', async (_req, res) => {
  const s = await settings();
  res.json({ appName: s.app_name, rtc: config.rtcProvider, livekit: !!(config.livekitUrl && config.livekitApiKey), payments: config.razorpayKeyId ? 'razorpay' : 'dev', otp: config.otpProvider, ai: !!config.anthropicKey, liveCheckMinutes: Number(s.live_check_minutes) });
});
app.use('/api/auth', authRoutes);
app.use('/api/agency-panel', agencyPanel);
app.use('/api/admin', adminTrust, adminRoutes);
app.use('/api', publicTrust, trustRoutes, userRoutes, walletRoutes, liveRoutes, agencyApp);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'Unknown API route' }));

// Static files: uploads, built-in animations, and the two web apps when built.
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '30d' }));
app.use('/anims', express.static(path.join(root, 'animations', 'dist'), { maxAge: '7d' }));
const adminDist = path.join(root, 'admin', 'dist');
const appDist = path.join(root, 'app', 'dist');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get(/^\/admin(\/.*)?$/, (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
}
if (fs.existsSync(appDist)) {
  app.use(express.static(appDist));
  app.get(/^\/(?!api|uploads|anims|socket\.io).*/, (_req, res) => res.sendFile(path.join(appDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.code, message: err.message, ...(err.extra || {}) });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json', message: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'server_error', message: 'Something went wrong' });
});

const server = http.createServer(app);
initRealtime(server);
await resumePks();

// Background jobs.
setInterval(async () => {
  // Close rooms whose host stopped sending heartbeats.
  try {
    const timeout = Number((await settings()).heartbeat_timeout_sec) * 1000;
    const dead = await db.all("SELECT id FROM rooms WHERE status = 'live' AND last_beat < ?", [now() - timeout]);
    for (const d of dead) await endRoom(d.id, 'timeout');
  } catch (e) { console.error('reaper', e); }
}, 30e3);
setInterval(() => runLiveChecks().catch((e) => console.error('livecheck', e)), 15e3);

setInterval(async () => {
  try {
    // Weekly agency settlements (created as "pending" for finance to approve).
    const p = lastWeek();
    const done = await db.one('SELECT 1 AS x FROM agency_settlements WHERE period_start = ? LIMIT 1', [p.start]);
    if (!done) await runSettlements(p.start, p.end);
    // Monthly agency level recalculation.
    const month = new Date(now() + 5.5 * 3600e3).toISOString().slice(0, 7);
    const last = await db.one("SELECT value FROM settings WHERE key = 'last_level_month'");
    if (last?.value !== month) {
      await recalcLevels();
      await db.q("INSERT INTO settings (key, value) VALUES ('last_level_month', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [month]);
    }
  } catch (e) { console.error('jobs', e); }
}, 60 * 60e3);

if (config.devAllowed && process.env.NODE_ENV === 'production') console.warn('WARNING: ALLOW_DEV_MODE=1 - OTP 123456 and free recharges are enabled. Never use this for real users.');
server.listen(config.port, () => {
  console.log(`Indi Fun server on http://localhost:${config.port}  (db: ${db.kind}, live video: ${config.rtcProvider})`);
});
