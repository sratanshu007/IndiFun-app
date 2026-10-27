// Countries, local prices, phone numbers and language detection for running the app worldwide.
import { db } from './db.js';
import { bad } from './lib.js';

let cache = null;
let cacheAt = 0;
export async function countries() {
  if (!cache || Date.now() - cacheAt > 60e3) {
    const rows = await db.all('SELECT * FROM countries ORDER BY sort, name');
    cache = rows.map((c) => ({
      ...c,
      coins_per_unit: Number(c.coins_per_unit),
      diamonds_per_unit: Number(c.diamonds_per_unit),
      payment_methods: safeJson(c.payment_methods, []),
      payout_methods: safeJson(c.payout_methods, ['upi', 'bank']),
    }));
    cacheAt = Date.now();
  }
  return cache;
}
export const clearCountryCache = () => { cache = null; };
function safeJson(s, d) { try { return s ? JSON.parse(s) : d; } catch { return d; } }

export async function country(code) {
  const all = await countries();
  return all.find((c) => c.code === code) || all.find((c) => c.code === 'IN') || {
    code: 'IN', name: 'India', dial_code: '91', currency: 'INR', symbol: '₹', coins_per_unit: 10, diamonds_per_unit: 25,
    payment_methods: ['UPI', 'Cards', 'Netbanking'], payout_methods: ['upi', 'bank'], default_language: 'hi', region: 'IN',
  };
}

// Currencies whose smallest unit is 1/1000 (we keep prices in "minor units" everywhere).
const THREE_DEC = new Set(['KWD', 'BHD', 'OMR', 'JOD', 'TND']);
const ZERO_DEC = new Set(['JPY', 'KRW', 'VND']);
export const minorFactor = (cur) => (THREE_DEC.has(cur) ? 1000 : ZERO_DEC.has(cur) ? 1 : 100);

export function money(minor, cur, symbol) {
  const v = Number(minor || 0) / minorFactor(cur);
  const frac = Math.abs(v % 1) > 0.0001;
  return `${symbol || cur + ' '}${v.toLocaleString('en-IN', { maximumFractionDigits: frac ? 2 : 0, minimumFractionDigits: frac ? 2 : 0 })}`;
}

// What a gift costs in the viewer's money, e.g. 499 coins -> "₹49.90" or "AED 2.27".
export function coinsToLocal(coins, c) {
  const units = Number(coins) / Number(c.coins_per_unit || 10);
  return { amount: Math.round(units * 100) / 100, label: money(Math.round(units * minorFactor(c.currency)), c.currency, c.symbol) };
}

// Phone numbers: India keeps the 10-digit format used since v1, other countries are stored as +<dial><number>.
export function normPhone(raw, countryCode = 'IN', dial = '91') {
  const d = String(raw || '').replace(/\D/g, '');
  if (countryCode === 'IN') {
    const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d;
    if (!/^[6-9]\d{9}$/.test(ten)) throw bad('bad_phone', 'Enter a valid 10-digit mobile number');
    return ten;
  }
  const local = d.startsWith(dial) && d.length > 10 ? d.slice(dial.length) : d.replace(/^0+/, '');
  if (!/^\d{6,12}$/.test(local)) throw bad('bad_phone', 'Enter a valid mobile number');
  return `+${dial}${local}`;
}

// Script-based language guess for chat messages (good enough to decide whether to offer translation).
const SCRIPTS = [
  [/[ऀ-ॿ]/, 'hi'], [/[؀-ۿ]/, 'ar'], [/[ঀ-৿]/, 'bn'], [/[஀-௿]/, 'ta'],
  [/[ఀ-౿]/, 'te'], [/[਀-੿]/, 'pa'], [/[ഀ-ൿ]/, 'ml'], [/[઀-૿]/, 'gu'],
  [/[ಀ-೿]/, 'kn'], [/[฀-๿]/, 'th'], [/[Ѐ-ӿ]/, 'ru'], [/[一-鿿]/, 'zh'],
];
export function detectLang(text) {
  for (const [re, l] of SCRIPTS) if (re.test(text)) return l;
  return 'latn'; // English, Hinglish, Bahasa, Tagalog... all written in Latin letters
}

export const CATEGORIES = ['talk', 'music', 'bhakti', 'shayari', 'comedy', 'astrology', 'study', 'dance', 'cooking', 'fitness', 'games'];
export const LANGUAGES = ['hi', 'en', 'ar', 'bn', 'ta', 'te', 'mr', 'gu', 'pa', 'ml', 'kn', 'bho', 'ur', 'id', 'tl'];
