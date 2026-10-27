// Optional AI helpers (moderation of live frames and chat, chat translation) using the Anthropic API.
// Everything here degrades gracefully: with no ANTHROPIC_API_KEY the functions return "not available"
// and the app falls back to the keyword filter and human moderators.
import fs from 'node:fs';
import { config } from './config.js';

export const aiOn = () => !!config.anthropicKey;

async function call(content, maxTokens = 400) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.aiModel, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content || []).map((c) => c.text || '').join('');
}
function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return m ? JSON.parse(m[0]) : null;
}

const IMAGE_POLICY = `You are a content moderator for a public live-streaming app (adults 18+, India and worldwide).
Look at this single frame from a live video and classify it. Reply with JSON only:
{"safe": true|false, "category": "ok|nudity|sexual|minor_alone|violence|weapon|drugs|gambling|other", "confidence": 0-1, "reason": "short"}
Mark unsafe for: nudity or sexual acts or sexualised poses, a child who appears to be streaming or shown in a sexual/unsafe way,
graphic violence, weapons used to threaten, drug use, betting/gambling promotion. Normal clothing, dancing, singing, prayer, makeup are safe.`;

export async function checkImage(file) {
  if (!aiOn()) return { available: false };
  const data = fs.readFileSync(file).toString('base64');
  const text = await call([
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
    { type: 'text', text: IMAGE_POLICY },
  ], 200);
  return { available: true, ...(parseJson(text) || { safe: true, category: 'ok', confidence: 0 }) };
}

const CHAT_POLICY = `You moderate chat messages in a live-streaming app. Messages may be in Hindi, Hinglish, English, Arabic or other languages.
For each message decide if it must be removed: sexual harassment or explicit sexual content, hate speech, threats, sharing contact details to move people off the app,
scams (asking for money, fake recharge offers), or content sexualising minors. Mild slang and friendly teasing are fine.
Reply with JSON only: {"remove": [indexes of messages to remove], "reasons": {"index": "short reason"}}`;

export async function checkChat(messages) {
  if (!aiOn() || !messages.length) return { available: false, remove: [] };
  const list = messages.map((m, i) => `${i}: ${m}`).join('\n');
  const text = await call([{ type: 'text', text: `${CHAT_POLICY}\n\nMessages:\n${list}` }], 300);
  const out = parseJson(text) || {};
  return { available: true, remove: Array.isArray(out.remove) ? out.remove.map(Number) : [], reasons: out.reasons || {} };
}

const NAMES = { hi: 'Hindi (Devanagari)', en: 'English', ar: 'Arabic', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', pa: 'Punjabi', ml: 'Malayalam', kn: 'Kannada', ur: 'Urdu', id: 'Indonesian', tl: 'Filipino', fr: 'French', es: 'Spanish', pt: 'Portuguese' };
const cache = new Map();
export async function translate(texts, to) {
  const target = NAMES[to] || 'English';
  const out = texts.map((t) => cache.get(`${to}|${t}`));
  const todo = texts.map((t, i) => (out[i] === undefined ? i : -1)).filter((i) => i >= 0);
  if (!todo.length) return { available: true, texts: out };
  if (!aiOn()) return { available: false, texts };
  const prompt = `Translate each chat message into ${target}. Keep names, emojis and tone (casual, friendly). If a message is already in ${target}, return it unchanged.
Reply with a JSON array of strings, same order, nothing else.\n\n${JSON.stringify(todo.map((i) => texts[i]))}`;
  const arr = parseJson(await call([{ type: 'text', text: prompt }], 800)) || [];
  todo.forEach((i, k) => {
    const v = typeof arr[k] === 'string' ? arr[k] : texts[i];
    out[i] = v;
    if (cache.size > 5000) cache.delete(cache.keys().next().value);
    cache.set(`${to}|${texts[i]}`, v);
  });
  return { available: true, texts: out };
}
