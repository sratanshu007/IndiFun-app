# LiveApp: live streaming app with gifts, PK, VIP and agencies

A Mico/Bigo-style social live-streaming app built in React and Node.js. It has three parts:

| Folder | What it is | Runs at |
| --- | --- | --- |
| `app/` | The user app (React, mobile-first PWA). Video live, party rooms, chat, gifts, PK battles, VIP, store, wallet, host centre, agency join, DMs, leaderboard | `/` |
| `admin/` | Admin panel and agency panel (React). Login role decides which one opens | `/admin` |
| `server/` | API + realtime server (Node.js, Express 5, Socket.IO). SQLite for development, PostgreSQL for production | `/api` |
| `animations/` | 24 original gift animations (incl. premium set: Tiranga, Taj Mahal, Tiger, Lion King, Emperor Crown, Fairy, Superbike, Supercar), 4 entry effects, 4 avatar frames (Lottie JSON) + the Python generators | `/anims` |

**Hindi summary:** `npm run setup`, `npm run seed:demo`, `npm run build`, `npm start` chalao, phir `http://localhost:4000` kholo. Login ke liye koi bhi number aur OTP `123456` (test mode). Admin panel `http://localhost:4000/admin`. Real video ke liye self-hosted LiveKit (Oracle free setup `deploy/oracle/`), real payment ke liye Razorpay keys, real OTP ke liye MSG91 / Google login.

---

## 1. Run it on your computer (10 minutes)

Needs **Node.js 22.13 or newer**.

```bash
npm run setup        # installs server, app and admin packages
npm run seed:demo    # creates the database with gifts, store, VIP, packs + demo hosts
npm run build        # builds the user app and admin panel
npm start            # http://localhost:4000
```

Demo logins (test mode, OTP is always `123456`):

| Who | Login |
| --- | --- |
| Viewer with 2 lakh coins | phone `9999999999` |
| Host who can go live | phone `8888888888` |
| Any new user | any 10-digit mobile number |
| Admin panel | `admin@liveapp.local` / `admin12345` at `/admin` |
| Agency panel | `agency@liveapp.local` / `agency12345` at `/admin` |

For development with hot reload run these in three terminals: `npm run dev:server`, `npm run dev:app` (http://localhost:5173), `npm run dev:admin` (http://localhost:5174/admin/).

> `--demo` creates 8 fake "live" rooms that never close. Do not use `seed:demo` on the production database; use `npm run seed`.

## 2. Turn on the real services

Copy `server/.env.example` to `server/.env` and fill in:

| Service | Variables | Without it |
| --- | --- | --- |
| **LiveKit** (live video/audio) | `RTC_PROVIDER=livekit`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Demo mode: the host sees their own camera, viewers see the cover image |
| **MSG91** (OTP SMS) | `OTP_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | OTP is always 123456 |
| **Razorpay** (coin recharge) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Coins are added free (test mode) |
| **PostgreSQL** | `DATABASE_URL` | SQLite file in `server/data/` |
| Security | `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Server refuses to start in production without `JWT_SECRET` |

With `NODE_ENV=production` the test shortcuts (OTP 123456, free coins) are switched off automatically.

## 3. Deploy

**Docker (easiest):** fill `server/.env`, then `docker compose up -d --build`. It starts PostgreSQL and the app on port 4000. Put Nginx or Cloudflare in front for HTTPS (camera and mic only work on HTTPS). WebSockets must be allowed for `/socket.io`.

**Without Docker:** Node 22 + PostgreSQL 16 on any VPS (AWS, DigitalOcean, Hostinger). `npm run setup && npm run build && npm run seed && NODE_ENV=production npm start`, managed with `pm2`.

Scaling later: run several server copies behind a load balancer with the Socket.IO Redis adapter, and move `uploads/` to S3 or Cloudflare R2.

## 4. Android / iOS app (Expo & Capacitor)

### Option A: Expo (Recommended for fast dev & testing on mobile)

The app includes an **Expo mobile client** in `mobile/` with camera/mic permissions, auto-LAN IP detection, and WebGL VAP 3D gifts support:

```bash
# 1. Install mobile dependencies
npm run setup:mobile   # or: cd mobile && npm install

# 2. Start Expo dev server
npm run dev:expo       # or: cd mobile && npx expo start

# 3. Test on your phone
# Open the "Expo Go" app on your iOS / Android phone (connected to same Wi-Fi) and scan the QR code!
```

### Option B: Capacitor (Web wrapper for native Play Store / App Store release)

```bash
cd app
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init LiveApp com.yourcompany.liveapp --web-dir dist
npm run build && npx cap add android && npx cap sync
npx cap open android      # build the APK / AAB in Android Studio
```

Add `CAMERA`, `RECORD_AUDIO` and `INTERNET` permissions in `AndroidManifest.xml` and point API calls to your server domain (set `server.url` in `capacitor.config` or serve the app from your domain). **Google Play and Apple require their own in-app billing for coins** inside store apps; add a billing plugin (for example `cordova-plugin-purchase`) and verify receipts on the server before going live on the stores. Razorpay/UPI checkout is fine on the web version.

## 5. Gifts and animations

All gift, entry and frame animations are original, made for this project (no assets from Mico/Bigo or other apps).

- **Player** (`app/src/components/AnimPlayer.jsx`) plays **Lottie (.json)**, **SVGA (.svga)** and **video (.mp4/.webm)**. Set the format per gift in the admin panel.
- **Tiers decide how a gift shows:** `small` = strip with mini animation; `medium` / `large` = full-screen; `super` = full-screen + banner in every room.
- **Add new gifts without code:** Admin → Gifts & store → Add gift → upload icon + animation. Designers export Lottie from After Effects with the Bodymovin plugin, or SVGA with the SVGA converter.
- Regenerate or edit the built-in animations: `python3 animations/make_anims.py` and `python3 animations/make_premium.py` (icons: `animations/tools/render.cjs`; preview video: `animations/tools/showcase.cjs`, needs `npm i` in `animations/tools` and ffmpeg).
- Existing databases get new gifts by running `npm run seed` again (it only adds missing items).

### 3D gifts (Mico/Bigo style)

`animations/three/` holds **30 real 3D scenes** (Three.js) — rose, bouquet, heart, balloons, teddy, chocolates, cake, gift box, ring, big diamond, crown, trophy, treasure chest, gold rain, perfume, magic lamp, diya, Taj Mahal, tiranga, Diwali fireworks, lotus, cricket six, sports car, yacht, private jet, rocket, hot-air balloon, fairytale castle, Saturn and crystal ball. "Ultra" quality (default) uses a photographed studio HDRI for real reflections, brilliant-cut gems in a jeweller's light box, highlight bloom and a final sharpen; `?q=basic` keeps the faster look. They are rendered to a transparent "side-by-side alpha" video (left half colour, right half alpha), the same idea as Tencent VAP used by big live apps. The app's player (`app/src/components/vapPlayer.js`) joins the halves with WebGL so the 3D gift floats over the live video. Each gift has an `.mp4` (H.264, phones) and a `.webm` twin (fallback).

Render or change a 3D gift: `cd animations/three && npm i && node render.cjs crown3d` (needs Playwright + ffmpeg; 10–25 minutes per gift on a laptop CPU, much faster with a GPU). Render many at once with the queue: `touch queue/<name>.todo` for each and run `node queue.cjs 2`. Outputs go to `animations/dist/<name>.mp4/.webm` and a watchable preview to `animations/preview/`. A 3D artist can also export from Blender/Cinema 4D as a side-by-side alpha MP4 and upload it in the admin panel with format `vap`.

## 6. Trust, safety and worldwide (v2)

These are the gaps users complain about most in live apps; the app fills them out of the box.

**Spending you can trust**
- Every gift shows its price in the user's own money (₹, AED, $…), not only coins.
- Gifts above a set value (default 5,000 coins) always ask "are you sure?" — no accidental one-tap spending.
- Users can set a **daily gift limit**. Lowering works at once; raising waits 24 hours (cooling-off).
- **Accidental recharge refunds:** within 24 hours, if the coins are unused. Coins are held at once; finance refunds through Razorpay from Admin → Trust & safety.
- **Ban appeals:** a banned user sees an appeal page (not a dead login). Admin can unban, reject, or keep the ban but pay out the host's earned diamonds.

**Real, verified hosts**
- Hosts verify with a photo of an ID + a **live selfie with a random gesture** taken in the app camera (stops photo-of-a-photo fakes). Only the last 4 characters of the ID number are stored; the ID photo is deleted after approval; files live in a private folder, never public.
- Blue "Verified" tick on profiles, live cards and in rooms. Setting `require_kyc_to_go_live` (on by default).
- **"I'm live" checks:** every ~10 minutes the host taps a prompt; missing it twice ends the live (catches pre-recorded "fake live" loops).
- To use DigiLocker / Aadhaar e-KYC instead of manual review, connect a provider such as Setu, Signzy or IDfy — the check plugs in at `POST /api/kyc` (`server/src/routes/trust.js`).

**Moderation**
- Hosts' apps send a small frame every minute to the admin **live wall** (Admin → Live monitor), flagged lives first.
- With `ANTHROPIC_API_KEY` set, each frame and the chat are checked by AI (nudity, minors, violence, scams, harassment; Hindi, Hinglish and Arabic). Flags go to Admin → Trust & safety; `ai_auto_end=1` lets AI end a live on high-confidence nudity.
- Chat filter now also hides Instagram/Telegram/WhatsApp handles; repeated abuse gives strikes and an automatic mute.
- Users can see what happened to their reports (Safety page).

**Host earnings in the open**
- Host centre shows a rate card: 1 coin = 1 diamond, how many diamonds make ₹1 (or AED 1 …), minimum withdrawal, and that **agency commission is paid by the app, never cut from the host**.
- Optional instant UPI payouts for verified hosts through RazorpayX (`RAZORPAYX_ACCOUNT_NUMBER` + setting `auto_payout_max_paise`). Beta: test in RazorpayX test mode first.

**Categories and Bharat-first**
- Live categories: Talk, Music, Bhakti, Shayari, Comedy, Astrology, Study, Dance, Cooking, Fitness, Games (casual only — no real-money games, which the Online Gaming Act 2025 bans).
- Filters: "My country" and "My language"; live language chosen when going live (15 languages incl. Bhojpuri).
- **Low data mode** (smaller video stream, no video preloading) and **audio-only** viewing of video lives.

**Worldwide**
- Login with any country code; country decides currency, recharge packs, payment and payout methods (Admin → Countries).
- App language: Hindi, English, Arabic (full right-to-left layout). Add more in `app/src/i18n.js`.
- **Live chat translation** (needs `ANTHROPIC_API_KEY`): viewers can read the chat in their own language.
- Local gifts tab per region (India, Gulf…), country and world leaderboards.
- Seeded countries: India, UAE, Saudi Arabia, Qatar, US, UK, Canada, Australia, Singapore, Indonesia, Philippines, Nepal, Bangladesh. Exchange rates in the seed are approximate — check them before launch. Payments outside India need Razorpay International Payments (cards) or a local gateway for mada / STC Pay / GCash.

## 7. What is included

- **User app:** OTP login (18+ check), home with banners and tabs, video live with beauty toggle and camera flip, party rooms with 8 seats, live chat with filter (bad words, phone numbers and links hidden), likes, gift panel with combo and quantities, full-screen gift queue, entry effects, avatar frames, chat bubbles, global gift banner, PK battle (invite or random, 5-minute timer, score bar, win/lose), wallet and recharge, store and VIP, host centre (earnings, daily record, withdrawal), agency join/leave/invites/apply, DMs, profiles with gift wall, leaderboards, report and block.
- **Server:** ledger-based wallet (every coin and diamond movement recorded; no double charge on repeated taps), LiveKit token generation, heartbeat auto-close, PK timers, weekly agency settlements and monthly level recalculation, rate limiting, audit log.
- **Admin panel:** dashboard with 14-day charts, users (ban, unban, balance adjust, host approval, wallet history), live monitor (watch, warn, end live), reports queue, gifts/store/VIP/banners editor with animation preview, withdrawals, agency commission, recharge packs, agencies (approve, level, settlement mode, panel login), agency levels, settings, admin team with roles (super, finance, moderator, support), audit log.
- **Agency panel:** dashboard (diamonds, commission estimate, level progress, charts), hosts with hours / valid days / diamonds, invite by ID, remove, per-host charts, weekly commission history.

## 8. Before launch (not done yet)

- [ ] Oracle Cloud VM setup (`deploy/oracle/`), MSG91 / Google login, Razorpay accounts and keys; HTTPS domain
- [ ] `ANTHROPIC_API_KEY` for AI moderation + translation (frames are checked once a minute)
- [ ] DigiLocker / e-KYC provider if you want automatic ID checks (manual review works today)
- [ ] Local payment gateways for each country you open (Tap / Checkout.com for mada and STC Pay, etc.)
- [ ] AR face filters; the beauty toggle today is a light local filter
- [ ] Google Play Billing / Apple IAP for store builds
- [ ] Push notifications (Firebase) for "host is live"
- [ ] Privacy policy, terms, grievance officer (IT Rules 2021), DPDP consent text
- [ ] GST on coin sales and TDS on payouts set up with your CA
- [ ] Load test with real users on LiveKit before marketing

## 9. Project map

```
server/src/index.js         app entry, background jobs
server/src/schema.sql       database tables
server/src/routes/          auth, users, wallet, live (rooms, gifts, PK), agency, admin
server/src/realtime.js      Socket.IO: presence, chat, likes, seats, broadcasts
server/src/agencyLogic.js   commission and level rules
server/src/routes/trust.js  spend limits, refunds, host ID check, appeals, translation, live snapshots
server/src/routes/adminTrust.js  admin queues for the above + countries
server/src/world.js         countries, local prices, phone numbers, language detection
server/src/ai.js            optional AI moderation and translation (Anthropic API)
server/src/payouts.js       optional RazorpayX instant UPI payouts
server/src/rtc.js           LiveKit WebRTC token & video grant generation
app/src/i18n.js             Hindi / English / Arabic text
app/src/live/               live room, LiveKit hook, gift panel, effect layers, PK
app/src/pages/              home, login, profile, wallet, store, host, agency, chats
admin/src/pages/            admin and agency panel screens
animations/                 Lottie generator, output in animations/dist
deploy/oracle/              Docker Compose (Postgres, LiveKit, App, Caddy) + Oracle guide
```
