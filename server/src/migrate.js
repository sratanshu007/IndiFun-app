// Adds columns introduced after the first release. Each statement is skipped if the column exists,
// so this is safe to run on every start for both SQLite and PostgreSQL.
const COLUMNS = [
  ['users', 'country', "TEXT DEFAULT 'IN'"],
  ['users', 'verified', 'INTEGER DEFAULT 0'],
  ['users', 'daily_limit_coins', 'BIGINT DEFAULT 0'],
  ['users', 'pending_limit_coins', 'BIGINT'],
  ['users', 'pending_limit_at', 'BIGINT'],
  ['users', 'strikes', 'INTEGER DEFAULT 0'],
  ['rooms', 'category', "TEXT DEFAULT 'talk'"],
  ['rooms', 'language', "TEXT DEFAULT 'hi'"],
  ['rooms', 'country', 'TEXT'],
  ['rooms', 'flagged', 'INTEGER DEFAULT 0'],
  ['rooms', 'snapshot', 'TEXT'],
  ['rooms', 'snapshot_at', 'BIGINT'],
  ['rooms', 'ai_note', 'TEXT'],
  ['rooms', 'checks_missed', 'INTEGER DEFAULT 0'],
  ['gifts', 'region', "TEXT DEFAULT 'all'"],
  ['recharge_packs', 'country', "TEXT DEFAULT 'IN'"],
  ['recharge_packs', 'currency', "TEXT DEFAULT 'INR'"],
  ['recharge_orders', 'currency', "TEXT DEFAULT 'INR'"],
  ['recharge_orders', 'gateway_payment_id', 'TEXT'],
  ['recharge_orders', 'refunded_at', 'BIGINT'],
  ['withdrawals', 'currency', "TEXT DEFAULT 'INR'"],
  ['withdrawals', 'country', "TEXT DEFAULT 'IN'"],
  ['withdrawals', 'payout_ref', 'TEXT'],
];

export async function migrate(impl) {
  for (const [table, col, type] of COLUMNS) {
    try {
      if (impl.kind === 'pg') await impl.exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      else {
        const cols = (await impl.q(`PRAGMA table_info(${table})`)).rows.map((r) => r.name);
        if (!cols.includes(col)) await impl.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
      }
    } catch (e) {
      console.error(`migrate ${table}.${col}:`, e.message);
    }
  }
}
