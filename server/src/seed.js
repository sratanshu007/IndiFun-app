// Seeds catalog data (gifts, store, VIP, packs, agency levels), admin logins and optional demo data.
//   npm run seed            -> catalog + admin logins (safe to run again; never overwrites admin edits)
//   npm run seed -- --demo  -> also demo hosts, live rooms, an agency and a demo viewer
//   npm run reset           -> deletes the SQLite file first
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const args = process.argv.slice(2);
if (args.includes('--reset') && !config.databaseUrl) {
  for (const f of [config.sqliteFile, `${config.sqliteFile}-wal`, `${config.sqliteFile}-shm`]) fs.rmSync(f, { force: true });
}
const { initDb, db, now, uid } = await import('./db.js');
const { hashPassword, moveMoney } = await import('./lib.js');
await initDb();

// Inserts a catalog row only if it does not exist yet, so running the seed again never
// overwrites changes made in the admin panel. Use --reset for a clean start.
const upsert = async (table, key, row) => {
  const ex = await db.one(`SELECT 1 AS x FROM ${table} WHERE ${key} = ?`, [row[key]]);
  if (ex) return;
  const keys = Object.keys(row);
  await db.q(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => row[k]));
};

// ---------- gifts (original animations in /animations) ----------
const A = (f) => `/anims/${f}.json`;
const I = (f) => `/anims/icons/${f}.png`;
const gifts = [
  ['rose', 'Rose', 1, 'small', 'popular'], ['heart', 'Heart', 5, 'small', 'popular'], ['chai', 'Cutting Chai', 10, 'small', 'popular'],
  ['samosa', 'Samosa', 19, 'small', 'popular'], ['star', 'Lucky Star', 49, 'small', 'popular'], ['diya', 'Diya', 99, 'small', 'festival'],
  ['balloons', 'Balloons', 199, 'medium', 'popular'], ['crown', 'Gold Crown', 299, 'medium', 'luxury'], ['ring', 'Diamond Ring', 499, 'medium', 'luxury'],
  ['fireworks', 'Fireworks', 999, 'medium', 'festival'], ['car', 'Sports Car', 2999, 'large', 'luxury'], ['rocket', 'Rocket', 4999, 'large', 'luxury'],
  ['lovestorm', 'Love Storm', 5999, 'large', 'popular'], ['palace', 'Royal Palace', 9999, 'large', 'luxury'],
  ['meteor', 'Meteor Shower', 19999, 'super', 'luxury'], ['galaxy', 'Galaxy', 49999, 'super', 'luxury'],
  // premium set
  ['tiranga', 'Tiranga', 1499, 'large', 'festival'], ['fairy', 'Fairy Magic', 3999, 'large', 'popular'], ['superbike', 'Superbike', 4999, 'large', 'luxury'],
  ['tiger', 'Tiger Roar', 7999, 'large', 'popular'], ['lion', 'Lion King', 9999, 'large', 'luxury'], ['emperor', 'Emperor Crown', 19999, 'super', 'luxury'],
  ['tajmahal', 'Taj Mahal', 29999, 'super', 'festival'], ['supercar', 'Supercar', 39999, 'super', 'luxury'],
];
gifts.sort((a, b) => a[2] - b[2]);
let sort = 0;
for (const [id, name, coins, tier, category] of gifts) {
  await upsert('gifts', 'id', { id, name, coins, tier, category, icon: I(id), anim_url: A(id), anim_type: 'lottie', global_banner: tier === 'super' ? 1 : 0, active: 1, sort: sort++ });
}
// 3D gifts: rendered 3D animations played as transparent (side-by-side alpha) video
const gifts3d = [
    ['rose3d', '3D Red Rose', 99, 'small'], ['heart3d', '3D Love Heart', 299, 'small'], ['lotus3d', '3D Lotus', 399, 'small'], ['diya3d', '3D Diya', 499, 'small'],
    ['balloons3d', '3D Heart Balloons', 699, 'medium'], ['chocolate3d', '3D Chocolate Box', 799, 'medium'], ['teddy3d', '3D Teddy Bear', 999, 'medium'], ['bouquet3d', '3D Rose Bouquet', 1299, 'medium'],
    ['cake3d', '3D Birthday Cake', 1499, 'medium'], ['giftbox3d', '3D Gift Box', 1999, 'large'], ['perfume3d', '3D Luxury Perfume', 2499, 'large'], ['cricket3d', '3D Cricket Six', 2999, 'large'],
    ['tiranga3d', '3D Tiranga', 3499, 'large'], ['crystal3d', '3D Crystal Ball', 3999, 'large'], ['lamp3d', '3D Magic Lamp', 4999, 'large'], ['ring3d', '3D Diamond Ring', 6999, 'large'],
    ['trophy3d', '3D Gold Trophy', 7999, 'large'], ['fireworks3d', '3D Diwali Fireworks', 9999, 'large'], ['hotair3d', '3D Hot Air Balloon', 12999, 'super'], ['diamond3d', '3D Big Diamond', 14999, 'super'],
    ['goldrain3d', '3D Gold Rain', 19999, 'super'], ['crown3d', '3D Royal Crown', 24999, 'super'], ['chest3d', '3D Treasure Chest', 29999, 'super'], ['saturn3d', '3D Saturn', 34999, 'super'],
    ['supercar3d', '3D Sports Car', 49999, 'super'], ['taj3d', '3D Taj Mahal', 59999, 'super'], ['castle3d', '3D Fairytale Castle', 69999, 'super'], ['yacht3d', '3D Luxury Yacht', 79999, 'super'],
    ['rocket3d', '3D Rocket', 89999, 'super'], ['jet3d', '3D Private Jet', 99999, 'super'],
  ];
for (const [i, [id, name, coins, tier]] of gifts3d.entries()) {
  await upsert('gifts', 'id', { id, name, coins, tier, category: '3d', icon: I(id), anim_url: `/anims/${id}.mp4`, anim_type: 'vap', global_banner: tier === 'super' ? 1 : 0, active: 1, sort: i });
}

// ---------- store: entry effects, avatar frames, chat bubbles ----------
const store = [
  ['entry_gold', 'entry', 'Golden Arrival', 1500, 0], ['entry_neon', 'entry', 'Neon Rider', 2500, 0],
  ['entry_royal', 'entry', 'Royal Welcome', 5000, 1], ['entry_fire', 'entry', 'Fire Storm', 8000, 1],
  ['frame_gold', 'frame', 'Gold Halo', 800, 0], ['frame_neon', 'frame', 'Neon Ring', 1200, 0],
  ['frame_hearts', 'frame', 'Love Orbit', 1500, 0], ['frame_royal', 'frame', 'Royal Aura', 3000, 1],
];
for (const [id, type, name, price, vip] of store) {
  await upsert('store_items', 'id', { id, type, name, anim_url: A(id), anim_type: 'lottie', preview: I(id), price, days: 30, vip_only: vip, active: 1 });
}
for (const [id, name, price] of [['bubble_gold', 'Gold Bubble', 500], ['bubble_pink', 'Pink Love Bubble', 500], ['bubble_neon', 'Neon Bubble', 900]]) {
  await upsert('store_items', 'id', { id, type: 'bubble', name, anim_url: id, anim_type: 'css', preview: null, price, days: 30, vip_only: 0, active: 1 });
}

// ---------- VIP ----------
const vip = [
  [1, 'Knight', 3000, '#7dd3fc', 'entry_gold', ['VIP badge', 'Entry effect', 'Colour name']],
  [2, 'Baron', 10000, '#a78bfa', 'entry_neon', ['All Knight perks', 'Neon entry', 'Priority seat']],
  [3, 'Duke', 30000, '#f472b6', 'entry_royal', ['All Baron perks', 'Royal entry', 'Anti-kick in rooms']],
  [4, 'King', 80000, '#fbbf24', 'entry_fire', ['All Duke perks', 'Fire entry', 'Exclusive gifts']],
  [5, 'Emperor', 200000, '#f97316', 'entry_fire', ['All King perks', 'Global entry banner', 'Top of viewer list']],
];
for (const [level, name, price, color, entry, perks] of vip) {
  await upsert('vip_tiers', 'level', { level, name, price, days: 30, color, entry_item_id: entry, perks: JSON.stringify(perks) });
}

// ---------- recharge packs ----------
const packs = [[2900, 290, 0], [9900, 1000, 0], [29900, 3000, 150], [99900, 10000, 800], [299900, 30000, 3000], [999900, 100000, 15000]];
for (const [i, [price, coins, bonus]] of packs.entries()) {
  await upsert('recharge_packs', 'id', { id: `pack_${i + 1}`, price_paise: price, coins, bonus, active: 1, sort: i });
}

// ---------- countries (worldwide) ----------
// Rates are starting points based on approximate exchange rates (1 INR = 10 coins). Check and edit them
// in Admin > Countries before launching a country. payment_methods is what the recharge screen shows,
// so only list methods your payment gateway really supports there.
const C = [
  // code, name, dial, currency, symbol, INR per unit, language, region, payment methods, payout methods
  ['IN', 'India', '91', 'INR', '₹', 1, 'hi', 'SASIA', ['UPI', 'Cards', 'Netbanking', 'Wallets'], ['upi', 'bank']],
  ['AE', 'United Arab Emirates', '971', 'AED', 'AED ', 23.5, 'ar', 'GCC', ['Visa / Mastercard'], ['bank_intl', 'wise', 'payoneer']],
  ['SA', 'Saudi Arabia', '966', 'SAR', 'SAR ', 23, 'ar', 'GCC', ['Visa / Mastercard'], ['bank_intl', 'wise', 'payoneer']],
  ['QA', 'Qatar', '974', 'QAR', 'QAR ', 23.7, 'ar', 'GCC', ['Visa / Mastercard'], ['bank_intl', 'wise', 'payoneer']],
  ['US', 'United States', '1', 'USD', '$', 86, 'en', 'WEST', ['Visa / Mastercard', 'PayPal'], ['paypal', 'payoneer', 'wise', 'bank_intl']],
  ['GB', 'United Kingdom', '44', 'GBP', '£', 113, 'en', 'WEST', ['Visa / Mastercard', 'PayPal'], ['paypal', 'wise', 'bank_intl']],
  ['CA', 'Canada', '1', 'CAD', 'C$', 62, 'en', 'WEST', ['Visa / Mastercard', 'PayPal'], ['paypal', 'wise', 'bank_intl']],
  ['AU', 'Australia', '61', 'AUD', 'A$', 56, 'en', 'WEST', ['Visa / Mastercard', 'PayPal'], ['paypal', 'wise', 'bank_intl']],
  ['SG', 'Singapore', '65', 'SGD', 'S$', 66, 'en', 'SEA', ['Visa / Mastercard'], ['wise', 'bank_intl']],
  ['ID', 'Indonesia', '62', 'IDR', 'Rp', 0.0052, 'id', 'SEA', ['Visa / Mastercard'], ['bank_intl', 'payoneer']],
  ['PH', 'Philippines', '63', 'PHP', '₱', 1.5, 'en', 'SEA', ['Visa / Mastercard'], ['bank_intl', 'payoneer']],
  ['NP', 'Nepal', '977', 'NPR', 'Rs ', 0.625, 'hi', 'SASIA', ['Visa / Mastercard'], ['bank_intl']],
  ['BD', 'Bangladesh', '880', 'BDT', '৳', 0.72, 'bn', 'SASIA', ['Visa / Mastercard'], ['bank_intl']],
];
const coinPacks = [[290, 0], [1000, 0], [3000, 150], [10000, 800], [30000, 3000], [100000, 15000]];
for (const [i, [code, name, dial, currency, symbol, inr, lang, region, pay, payout]] of C.entries()) {
  const cpu = Math.round(10 * inr * 10000) / 10000;
  await upsert('countries', 'code', { code, name, dial_code: dial, currency, symbol, coins_per_unit: cpu, diamonds_per_unit: Math.round(25 * inr * 10000) / 10000,
    payment_methods: JSON.stringify(pay), payout_methods: JSON.stringify(payout), default_language: lang, region, active: 1, sort: i });
  if (code === 'IN') continue;
  for (const [k, [coins, bonus]] of coinPacks.entries()) {
    const units = coins / cpu;
    const nice = units >= 1000 ? Math.ceil(units / 1000) * 1000 : units >= 100 ? Math.ceil(units / 10) * 10 - 0.01 : Math.ceil(units) - 0.01;
    await upsert('recharge_packs', 'id', { id: `pack_${code.toLowerCase()}_${k + 1}`, price_paise: Math.round(nice * 100), coins, bonus, active: 1, sort: k, country: code, currency });
  }
}
// Gifts that also show in a country's "Local" tab (all gifts are available everywhere).
const LOCAL = { SASIA: ['taj3d', 'diya3d', 'tiranga3d', 'cricket3d', 'lotus3d', 'fireworks3d', 'tajmahal', 'diya', 'tiranga', 'chai', 'samosa'], GCC: ['lamp3d', 'perfume3d', 'yacht3d', 'supercar3d', 'jet3d', 'crown3d', 'emperor', 'palace'] };
for (const [region, ids] of Object.entries(LOCAL)) {
  for (const id of ids) await db.q("UPDATE gifts SET region = ? WHERE id = ? AND (region IS NULL OR region = 'all')", [region, id]);
}

// ---------- agency levels (spec 10A) ----------
for (const [level, minD, minH, pct] of [[1, 0, 0, 4], [2, 1000000, 10, 6], [3, 5000000, 25, 8], [4, 20000000, 50, 10]]) {
  await upsert('agency_levels', 'level', { level, min_diamonds: minD, min_hosts: minH, pct });
}

// ---------- banners ----------
await upsert('banners', 'id', { id: 'b1', title: 'Diwali Gift Festival: send Diya, win rewards', image: '/anims/icons/banner_diwali.png', link: '/rank', active: 1, sort: 0 });
await upsert('banners', 'id', { id: 'b2', title: 'Become a host and earn from home', image: '/anims/icons/banner_host.png', link: '/me', active: 1, sort: 1 });

// ---------- admin logins ----------
// Set ADMIN_EMAIL and ADMIN_PASSWORD in .env for production; the defaults are for local testing only.
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@liveapp.local').toLowerCase();
const adminPass = process.env.ADMIN_PASSWORD || 'admin12345';
const admin = await db.one('SELECT id FROM admin_users WHERE email = ?', [adminEmail]);
if (!admin) {
  await db.q('INSERT INTO admin_users (id, email, password_hash, name, role, created_at) VALUES (?,?,?,?,?,?)',
    [uid(), adminEmail, hashPassword(adminPass), 'Super Admin', 'super', now()]);
}

console.log(`Seed complete. Super Admin login: ${adminEmail}`);
process.exit(0);
