import { Router } from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { db, now, uid, } from '../db.js';
import { userAuth, bad, notFound, moveMoney, wallet, num, setting, today, requireAdult } from '../lib.js';
import { country, money, minorFactor } from '../world.js';
import { autoPayout } from '../payouts.js';

const r = Router();
r.use(userAuth);

r.get('/wallet', async (req, res) => res.json(await wallet(req.user.id)));

r.get('/wallet/ledger', async (req, res) => {
  const cur = req.query.currency === 'diamonds' ? 'diamonds' : 'coins';
  res.json(await db.all('SELECT id, amount, balance_after, type, note, created_at FROM ledger WHERE user_id = ? AND currency = ? ORDER BY created_at DESC LIMIT 100', [req.user.id, cur]));
});

// ---------- recharge ----------
async function packsFor(u) {
  const c = await country(u.country);
  let packs = await db.all('SELECT * FROM recharge_packs WHERE active = 1 AND country = ? ORDER BY sort, price_paise', [c.code]);
  if (!packs.length) packs = await db.all("SELECT * FROM recharge_packs WHERE active = 1 AND country = 'IN' ORDER BY sort, price_paise");
  return { c, packs };
}
r.get('/recharge/packs', async (req, res) => {
  const { c, packs } = await packsFor(req.user);
  res.json({
    packs: packs.map((p) => ({ ...p, currency: p.currency || 'INR', priceLabel: money(p.price_paise, p.currency || 'INR', (p.currency || 'INR') === c.currency ? c.symbol : null) })),
    country: { code: c.code, name: c.name, currency: c.currency, methods: c.payment_methods },
    gateway: config.razorpayKeyId ? { provider: 'razorpay', keyId: config.razorpayKeyId } : { provider: 'dev' },
  });
});

r.post('/recharge/order', async (req, res) => {
  requireAdult(req.user);
  const pack = await db.one('SELECT * FROM recharge_packs WHERE id = ? AND active = 1', [req.body.packId]);
  if (!pack) throw notFound('Pack not found');
  const currency = pack.currency || 'INR';
  const coins = Number(pack.coins) + Number(pack.bonus || 0);
  const id = uid();
  if (!config.razorpayKeyId) {
    if (!config.devAllowed) throw bad('payments_off', 'Payments are not configured yet');
    // Dev mode: credit immediately so the whole app can be tested without a gateway.
    await db.tx(async (q) => {
      await q('INSERT INTO recharge_orders (id, user_id, pack_id, amount_paise, coins, channel, status, created_at, currency) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, req.user.id, pack.id, pack.price_paise, coins, 'dev', 'paid', now(), currency]);
      await moveMoney(q, { userId: req.user.id, currency: 'coins', amount: coins, type: 'recharge', refId: id, idemKey: `recharge:${id}` });
    });
    return res.json({ status: 'paid', coins, wallet: await wallet(req.user.id) });
  }
  const auth = Buffer.from(`${config.razorpayKeyId}:${config.razorpaySecret}`).toString('base64');
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: Number(pack.price_paise), currency, receipt: id }), // non-INR needs International Payments enabled on Razorpay
  });
  if (!resp.ok) throw bad('gateway_error', 'Payment gateway error, try again');
  const order = await resp.json();
  await db.q('INSERT INTO recharge_orders (id, user_id, pack_id, amount_paise, coins, channel, gateway_order_id, status, created_at, currency) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, req.user.id, pack.id, pack.price_paise, coins, 'razorpay', order.id, 'created', now(), currency]);
  res.json({ status: 'created', orderId: id, gatewayOrderId: order.id, amount: Number(pack.price_paise), currency, keyId: config.razorpayKeyId });
});

// Called by the app after Razorpay checkout succeeds. The signature proves the payment is genuine.
r.post('/recharge/verify', async (req, res) => {
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body;
  const expected = crypto.createHmac('sha256', config.razorpaySecret).update(`${oid}|${pid}`).digest('hex');
  if (!sig || expected !== sig) throw bad('bad_signature', 'Payment could not be verified');
  const order = await db.one('SELECT * FROM recharge_orders WHERE gateway_order_id = ? AND user_id = ?', [oid, req.user.id]);
  if (!order) throw notFound('Order not found');
  if (order.status === 'created') {
    await db.tx(async (q) => {
      const upd = await q("UPDATE recharge_orders SET status = 'paid', gateway_payment_id = ? WHERE id = ? AND status = 'created'", [pid, order.id]);
      if (upd.rowCount) await moveMoney(q, { userId: req.user.id, currency: 'coins', amount: Number(order.coins), type: 'recharge', refId: order.id, idemKey: `recharge:${order.id}` });
    });
  }
  res.json({ status: 'paid', wallet: await wallet(req.user.id) });
});

// ---------- store & VIP ----------
r.get('/store', async (req, res) => {
  const items = await db.all('SELECT * FROM store_items WHERE active = 1 ORDER BY type, price');
  const mine = await db.all('SELECT item_id, expires_at, equipped FROM user_items WHERE user_id = ? AND expires_at > ?', [req.user.id, now()]);
  const vip = await db.all('SELECT * FROM vip_tiers ORDER BY level');
  res.json({ items, mine, vip: vip.map((v) => ({ ...v, perks: v.perks ? JSON.parse(v.perks) : [] })), myVip: { level: req.user.vip_expiry > now() ? req.user.vip_level : 0, expiry: req.user.vip_expiry } });
});

async function grantItem(q, userId, itemId, days, equip) {
  const ex = (await q('SELECT * FROM user_items WHERE user_id = ? AND item_id = ?', [userId, itemId])).rows[0];
  const base = ex && ex.expires_at > now() ? Number(ex.expires_at) : now();
  const exp = base + days * 864e5;
  if (ex) await q('UPDATE user_items SET expires_at = ? WHERE id = ?', [exp, ex.id]);
  else await q('INSERT INTO user_items (id, user_id, item_id, expires_at, equipped) VALUES (?,?,?,?,0)', [uid(), userId, itemId, exp]);
  if (equip) {
    const item = (await q('SELECT type FROM store_items WHERE id = ?', [itemId])).rows[0];
    await q('UPDATE user_items SET equipped = 0 WHERE user_id = ? AND item_id IN (SELECT id FROM store_items WHERE type = ?)', [userId, item.type]);
    await q('UPDATE user_items SET equipped = 1 WHERE user_id = ? AND item_id = ?', [userId, itemId]);
  }
}

r.post('/store/buy', async (req, res) => {
  const item = await db.one('SELECT * FROM store_items WHERE id = ? AND active = 1', [req.body.itemId]);
  if (!item) throw notFound('Item not found');
  const isVip = req.user.vip_expiry > now() && req.user.vip_level > 0;
  if (item.vip_only && !isVip) throw bad('vip_only', 'This item is for VIP members');
  await db.tx(async (q) => {
    await moveMoney(q, { userId: req.user.id, currency: 'coins', amount: -Number(item.price), type: 'store', refId: item.id, note: item.name });
    await grantItem(q, req.user.id, item.id, Number(item.days), true);
  });
  res.json({ ok: true, wallet: await wallet(req.user.id) });
});

r.post('/store/equip', async (req, res) => {
  const own = await db.one('SELECT ui.*, s.type FROM user_items ui JOIN store_items s ON s.id = ui.item_id WHERE ui.user_id = ? AND ui.item_id = ? AND ui.expires_at > ?', [req.user.id, req.body.itemId, now()]);
  if (!own) throw notFound('You do not own this item');
  await db.tx(async (q) => {
    await q('UPDATE user_items SET equipped = 0 WHERE user_id = ? AND item_id IN (SELECT id FROM store_items WHERE type = ?)', [req.user.id, own.type]);
    if (req.body.equip !== false) await q('UPDATE user_items SET equipped = 1 WHERE id = ?', [own.id]);
  });
  res.json({ ok: true });
});

r.post('/vip/buy', async (req, res) => {
  const tier = await db.one('SELECT * FROM vip_tiers WHERE level = ?', [Number(req.body.level)]);
  if (!tier) throw notFound('VIP tier not found');
  const u = req.user;
  const active = u.vip_expiry > now();
  if (active && u.vip_level > tier.level) throw bad('lower_tier', 'You already have a higher VIP');
  await db.tx(async (q) => {
    await moveMoney(q, { userId: u.id, currency: 'coins', amount: -Number(tier.price), type: 'vip', refId: String(tier.level), note: tier.name });
    const base = active && u.vip_level === tier.level ? Number(u.vip_expiry) : now();
    await q('UPDATE users SET vip_level = ?, vip_expiry = ?, coins_spent = coins_spent + ? WHERE id = ?', [tier.level, base + tier.days * 864e5, Number(tier.price), u.id]);
    if (tier.entry_item_id) await grantItem(q, u.id, tier.entry_item_id, Number(tier.days), true);
  });
  res.json({ ok: true, wallet: await wallet(u.id) });
});

// ---------- host ----------
r.post('/host/apply', async (req, res) => {
  const u = req.user;
  const kyc = await db.one('SELECT status FROM host_kyc WHERE user_id = ?', [u.id]);
  if (kyc?.status === 'approved') {
    await db.q("UPDATE users SET host_status = 'approved', is_host = 1, verified = 1 WHERE id = ?", [u.id]);
    return res.json({ status: 'approved' });
  }
  if (kyc?.status === 'pending') {
    return res.json({ status: 'pending', message: 'Your host verification is under review by admin' });
  }
  if (u.host_status === 'suspended') {
    return res.json({ status: 'suspended', message: 'Your host privileges have been suspended by admin' });
  }
  res.json({ status: 'need_kyc', message: 'Please submit your Aadhaar / ID and live photo verification' });
});

// Transparent rate card shown to every host: what a gift is worth to them and who pays the agency.
async function rateCard(u) {
  const c = await country(u.country);
  const perUnit = c.code === 'IN' ? await num('diamonds_per_rupee') : Number(c.diamonds_per_unit);
  const agency = await db.one(`SELECT a.name, a.level, l.pct FROM agency_hosts ah JOIN agencies a ON a.id = ah.agency_id
    LEFT JOIN agency_levels l ON l.level = a.level WHERE ah.host_id = ? AND ah.status = 'active'`, [u.id]);
  return {
    diamondsPerRupee: perUnit, diamondsPerUnit: perUnit, currency: c.currency, symbol: c.symbol, country: c.code,
    minWithdraw: await num('min_withdraw_diamonds'), coinToDiamond: 1, methods: c.payout_methods,
    agency: agency ? { name: agency.name, level: Number(agency.level), pct: Number(agency.pct || 0), paidBy: 'platform' } : null,
    autoPayoutMinor: await num('auto_payout_max_paise'),
  };
}

r.get('/host/earnings', async (req, res) => {
  const u = req.user;
  const d = (days) => now() - days * 864e5;
  const sum = async (since) => Number((await db.one('SELECT COALESCE(SUM(diamonds),0) AS s FROM gift_tx WHERE receiver_id = ? AND created_at > ?', [u.id, since])).s);
  const daily = await db.all('SELECT day, live_seconds, diamonds FROM host_daily WHERE host_id = ? ORDER BY day DESC LIMIT 30', [u.id]);
  const withdrawals = await db.all('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [u.id]);
  res.json({
    today: Number((await db.one('SELECT COALESCE(SUM(diamonds),0) AS s FROM host_daily WHERE host_id = ? AND day = ?', [u.id, today()])).s),
    week: await sum(d(7)), month: await sum(d(30)), total: Number(u.diamonds_earned),
    wallet: await wallet(u.id), daily, withdrawals,
    rate: await rateCard(u),
    verified: !!u.verified,
  });
});

r.post('/host/withdraw', async (req, res) => {
  const diamonds = Math.floor(Number(req.body.diamonds));
  const min = await num('min_withdraw_diamonds');
  if (!(diamonds >= min)) throw bad('below_min', `Minimum withdrawal is ${min} diamonds`);
  const { method, account } = req.body;
  const card = await rateCard(req.user);
  if (!card.methods.includes(method) || !account) throw bad('need_account', 'Choose a payout method and add your account details');
  if (method === 'upi' && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(String(account).trim())) throw bad('bad_upi', 'Enter a valid UPI ID, e.g. name@okaxis');
  const id = uid();
  const amountMinor = Math.floor((diamonds / card.diamondsPerUnit) * minorFactor(card.currency));
  await db.tx(async (q) => {
    await moveMoney(q, { userId: req.user.id, currency: 'diamonds', amount: -diamonds, type: 'withdraw', refId: id });
    await q('INSERT INTO withdrawals (id, user_id, diamonds, amount_paise, method, account, status, created_at, currency, country) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, req.user.id, diamonds, amountMinor, method, String(account).trim().slice(0, 120), 'requested', now(), card.currency, card.country]);
  });
  let instant = null;
  if (method === 'upi' && card.currency === 'INR' && req.user.verified && card.autoPayoutMinor > 0 && amountMinor <= card.autoPayoutMinor) {
    instant = await autoPayout(id).catch((e) => { console.error('auto payout', e.message); return null; });
  }
  res.json({ ok: true, instant: !!instant, wallet: await wallet(req.user.id) });
});

export default r;
