// Agency commission and level logic (see spec section 10A).
import { db, now, uid } from './db.js';
import { moveMoney, num } from './lib.js';

const DAY = 864e5;

// Diamonds earned by the agency's hosts in [start, end), excluding self-gifting
// (gifts sent by the agency owner or by hosts of the same agency).
export async function agencyHostDiamonds(agency, start, end) {
  const rows = await db.all(
    `SELECT t.receiver_id, t.diamonds, t.created_at, ah.joined_at FROM gift_tx t
     JOIN agency_hosts ah ON ah.host_id = t.receiver_id AND ah.agency_id = ?
     WHERE t.created_at >= ? AND t.created_at < ?
       AND ah.joined_at <= t.created_at AND (ah.left_at IS NULL OR ah.left_at > t.created_at)
       AND t.sender_id <> ?
       AND t.sender_id NOT IN (SELECT host_id FROM agency_hosts WHERE agency_id = ? AND status = 'active')`,
    [agency.id, start, end, agency.owner_user_id, agency.id]);
  const bonusPct = await num('new_host_bonus_pct');
  let total = 0, bonusBase = 0;
  const perHost = new Map();
  for (const r of rows) {
    const d = Number(r.diamonds);
    total += d;
    if (Number(r.created_at) - Number(r.joined_at) < 30 * DAY) bonusBase += d;
    perHost.set(r.receiver_id, (perHost.get(r.receiver_id) || 0) + d);
  }
  return { total, bonus: Math.floor((bonusBase * bonusPct) / 100), perHost };
}

// Active host = at least 7 days in the window with 1+ hour live.
export async function activeHosts(agencyId, start, end) {
  const toDay = (t) => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 10);
  const r = await db.all(
    `SELECT hd.host_id, COUNT(*) AS days FROM host_daily hd
     JOIN agency_hosts ah ON ah.host_id = hd.host_id AND ah.agency_id = ? AND ah.status = 'active'
     WHERE hd.day >= ? AND hd.day < ? AND hd.live_seconds >= 3600 GROUP BY hd.host_id`,
    [agencyId, toDay(start), toDay(end)]);
  return r.filter((x) => Number(x.days) >= 7).length;
}

export async function levelPct(level) {
  const l = await db.one('SELECT pct FROM agency_levels WHERE level = ?', [level]);
  return l ? Number(l.pct) : 4;
}

// Last full Monday-Sunday week in IST.
export function lastWeek(t = now()) {
  const ist = new Date(t + 5.5 * 3600e3);
  const dow = (ist.getUTCDay() + 6) % 7; // Monday = 0
  const mondayIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - dow * DAY;
  const end = mondayIst - 5.5 * 3600e3;
  return { start: end - 7 * DAY, end };
}

export async function runSettlements(start, end) {
  const agencies = await db.all("SELECT * FROM agencies WHERE status = 'active'");
  const out = [];
  for (const a of agencies) {
    const exists = await db.one('SELECT id FROM agency_settlements WHERE agency_id = ? AND period_start = ? AND period_end = ?', [a.id, start, end]);
    if (exists) continue;
    const { total, bonus } = await agencyHostDiamonds(a, start, end);
    const pct = await levelPct(a.level);
    const commission = Math.floor((total * pct) / 100) + bonus;
    const id = uid();
    await db.q(`INSERT INTO agency_settlements (id, agency_id, period_start, period_end, host_diamonds, active_hosts, pct, commission, status, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, a.id, start, end, total, await activeHosts(a.id, start, end), pct, commission, commission > 0 ? 'pending' : 'zero', now()]);
    out.push(id);
  }
  return out;
}

export async function paySettlement(id) {
  return db.tx(async (q) => {
    const s = (await q("SELECT * FROM agency_settlements WHERE id = ? AND status = 'pending'", [id])).rows[0];
    if (!s) return false;
    const a = (await q('SELECT * FROM agencies WHERE id = ?', [s.agency_id])).rows[0];
    await moveMoney(q, { userId: a.owner_user_id, currency: 'diamonds', amount: Number(s.commission), type: 'agency_commission', refId: s.id, idemKey: `settle:${s.id}` });
    await q("UPDATE agency_settlements SET status = 'paid' WHERE id = ?", [s.id]);
    return true;
  });
}

// Monthly level recalculation from the last 30 days.
export async function recalcLevels() {
  const levels = await db.all('SELECT * FROM agency_levels ORDER BY level DESC');
  const end = now(), start = end - 30 * DAY;
  for (const a of await db.all("SELECT * FROM agencies WHERE status = 'active'")) {
    const { total } = await agencyHostDiamonds(a, start, end);
    const act = await activeHosts(a.id, start, end);
    const lvl = levels.find((l) => total >= Number(l.min_diamonds) && act >= Number(l.min_hosts));
    await db.q('UPDATE agencies SET level = ? WHERE id = ?', [lvl ? lvl.level : 1, a.id]);
  }
}
