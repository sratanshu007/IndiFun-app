-- Portable schema (SQLite + PostgreSQL). Money is stored as whole coins/diamonds/paise. Times are epoch ms.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  avatar TEXT,
  bio TEXT,
  language TEXT DEFAULT 'hi',
  coins_spent BIGINT DEFAULT 0,
  diamonds_earned BIGINT DEFAULT 0,
  vip_level INTEGER DEFAULT 0,
  vip_expiry BIGINT DEFAULT 0,
  is_host INTEGER DEFAULT 0,
  host_status TEXT DEFAULT 'none',
  status TEXT DEFAULT 'active',
  ban_until BIGINT DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  agency_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY,
  coins BIGINT NOT NULL DEFAULT 0,
  diamonds BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  type TEXT NOT NULL,
  ref_id TEXT,
  idem_key TEXT UNIQUE,
  note TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_user ON ledger(user_id, created_at);

CREATE TABLE IF NOT EXISTS recharge_packs (
  id TEXT PRIMARY KEY,
  price_paise BIGINT NOT NULL,
  coins BIGINT NOT NULL,
  bonus BIGINT DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recharge_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  amount_paise BIGINT NOT NULL,
  coins BIGINT NOT NULL,
  channel TEXT NOT NULL,
  gateway_order_id TEXT,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'popular',
  coins BIGINT NOT NULL,
  tier TEXT DEFAULT 'small',
  icon TEXT,
  anim_url TEXT,
  anim_type TEXT DEFAULT 'lottie',
  global_banner INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gift_tx (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  room_id TEXT,
  gift_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  coins BIGINT NOT NULL,
  diamonds BIGINT NOT NULL,
  pk_id TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS gift_tx_recv ON gift_tx(receiver_id, created_at);
CREATE INDEX IF NOT EXISTS gift_tx_send ON gift_tx(sender_id, created_at);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  cover TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  viewers INTEGER DEFAULT 0,
  peak INTEGER DEFAULT 0,
  diamonds BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  last_beat BIGINT
);
CREATE INDEX IF NOT EXISTS rooms_status ON rooms(status);

CREATE TABLE IF NOT EXISTS pk_battles (
  id TEXT PRIMARY KEY,
  room_a TEXT NOT NULL,
  room_b TEXT NOT NULL,
  host_a TEXT NOT NULL,
  host_b TEXT NOT NULL,
  score_a BIGINT DEFAULT 0,
  score_b BIGINT DEFAULT 0,
  status TEXT NOT NULL,
  started_at BIGINT,
  ends_at BIGINT,
  winner TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  anim_url TEXT,
  anim_type TEXT DEFAULT 'lottie',
  preview TEXT,
  price BIGINT NOT NULL,
  days INTEGER DEFAULT 30,
  vip_only INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  equipped INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vip_tiers (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price BIGINT NOT NULL,
  days INTEGER DEFAULT 30,
  color TEXT,
  entry_item_id TEXT,
  perks TEXT
);

CREATE TABLE IF NOT EXISTS agencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  owner_user_id TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  status TEXT NOT NULL,
  city TEXT,
  phone TEXT,
  settlement_mode TEXT DEFAULT 'direct',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS agency_levels (
  level INTEGER PRIMARY KEY,
  min_diamonds BIGINT NOT NULL,
  min_hosts INTEGER NOT NULL,
  pct NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS agency_hosts (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL,
  joined_at BIGINT,
  left_at BIGINT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS agency_hosts_a ON agency_hosts(agency_id, status);
CREATE INDEX IF NOT EXISTS agency_hosts_h ON agency_hosts(host_id, status);

CREATE TABLE IF NOT EXISTS agency_settlements (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL,
  period_start BIGINT NOT NULL,
  period_end BIGINT NOT NULL,
  host_diamonds BIGINT NOT NULL,
  active_hosts INTEGER NOT NULL,
  pct NUMERIC NOT NULL,
  commission BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  diamonds BIGINT NOT NULL,
  amount_paise BIGINT NOT NULL,
  method TEXT,
  account TEXT,
  status TEXT NOT NULL,
  note TEXT,
  created_at BIGINT NOT NULL,
  decided_at BIGINT
);

CREATE TABLE IF NOT EXISTS host_daily (
  host_id TEXT NOT NULL,
  day TEXT NOT NULL,
  live_seconds BIGINT DEFAULT 0,
  diamonds BIGINT DEFAULT 0,
  PRIMARY KEY (host_id, day)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  action TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  read_at BIGINT
);
CREATE INDEX IF NOT EXISTS messages_pair ON messages(from_id, to_id, created_at);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  title TEXT,
  image TEXT,
  link TEXT,
  active INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at BIGINT NOT NULL
);

-- ---------- Trust, safety & worldwide (v2) ----------
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,            -- ISO 3166 alpha-2, e.g. IN, AE
  name TEXT NOT NULL,
  dial_code TEXT NOT NULL,          -- e.g. 91, 971
  currency TEXT NOT NULL,           -- ISO 4217, e.g. INR, AED
  symbol TEXT NOT NULL,
  coins_per_unit NUMERIC NOT NULL,  -- coins a user gets for 1 unit of local currency (used to show gift prices)
  diamonds_per_unit NUMERIC NOT NULL, -- diamonds a host needs for 1 unit of local currency on withdrawal
  payment_methods TEXT,             -- JSON array shown on the recharge screen
  payout_methods TEXT,              -- JSON array of allowed withdrawal methods
  default_language TEXT DEFAULT 'en',
  region TEXT,                      -- IN, GCC, SEA, WEST ... (for regional gift packs)
  active INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS host_kyc (
  user_id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  country TEXT,
  doc_type TEXT NOT NULL,           -- aadhaar | pan | passport | driving_licence | national_id | emirates_id
  doc_last4 TEXT,                   -- only the last 4 characters are stored, never the full number
  id_file TEXT NOT NULL,            -- private file name (not publicly served)
  selfie_file TEXT NOT NULL,        -- live selfie taken in the app
  challenge TEXT,                   -- gesture the host was asked to show in the selfie
  provider TEXT DEFAULT 'manual',
  status TEXT NOT NULL,             -- pending | approved | rejected
  note TEXT,
  created_at BIGINT NOT NULL,
  decided_at BIGINT,
  decided_by TEXT
);

CREATE TABLE IF NOT EXISTS appeals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  payout_method TEXT,
  payout_account TEXT,
  status TEXT NOT NULL,             -- open | accepted | rejected | settled
  note TEXT,
  created_at BIGINT NOT NULL,
  decided_at BIGINT
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  coins BIGINT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,             -- open | refunded | rejected
  note TEXT,
  created_at BIGINT NOT NULL,
  decided_at BIGINT
);

CREATE TABLE IF NOT EXISTS moderation_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,               -- ai_image | ai_chat | live_check | strike | auto_end
  room_id TEXT,
  user_id TEXT,
  severity TEXT DEFAULT 'medium',   -- low | medium | high
  detail TEXT,
  image TEXT,
  status TEXT DEFAULT 'open',       -- open | reviewed
  action TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS mod_events_status ON moderation_events(status, created_at);
