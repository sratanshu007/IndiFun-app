// Tiny database adapter: SQLite (node:sqlite, built in) for development, PostgreSQL in production.
// All SQL in the app uses "?" placeholders and portable syntax; they are converted for Postgres.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { migrate } from './migrate.js';

let impl;

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function initSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(path.dirname(config.sqliteFile), { recursive: true });
  const db = new DatabaseSync(config.sqliteFile);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  let chain = Promise.resolve();
  const run = (sql, params = []) => {
    const stmt = db.prepare(sql);
    if (/^\s*(select|with|pragma)|returning/i.test(sql)) return { rows: stmt.all(...params), rowCount: undefined };
    const r = stmt.run(...params);
    return { rows: [], rowCount: Number(r.changes) };
  };
  const q = async (sql, params) => run(sql, params);
  return {
    kind: 'sqlite',
    q,
    exec: async (sql) => db.exec(sql),
    // Transactions are serialised (single connection) so concurrent requests never interleave.
    tx: (fn) => {
      const p = chain.then(async () => {
        db.exec('BEGIN IMMEDIATE');
        try {
          const out = await fn(q);
          db.exec('COMMIT');
          return out;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      });
      chain = p.catch(() => {});
      return p;
    },
  };
}

async function initPg() {
  const pg = (await import('pg')).default;
  pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT -> number
  pg.types.setTypeParser(1700, (v) => Number(v)); // NUMERIC -> number
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 20 });
  const wrap = (client) => async (sql, params = []) => {
    const r = await client.query(toPg(sql), params);
    return { rows: r.rows, rowCount: r.rowCount };
  };
  return {
    kind: 'pg',
    q: wrap(pool),
    exec: async (sql) => pool.query(sql),
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

export async function initDb() {
  impl = config.databaseUrl ? await initPg() : await initSqlite();
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await impl.exec(schema);
  await migrate(impl);
  return impl;
}

export const db = {
  get kind() { return impl.kind; },
  q: (sql, params) => impl.q(sql, params),
  one: async (sql, params) => (await impl.q(sql, params)).rows[0] || null,
  all: async (sql, params) => (await impl.q(sql, params)).rows,
  tx: (fn) => impl.tx(fn),
};

export const now = () => Date.now();
export const uid = () => crypto.randomUUID();
