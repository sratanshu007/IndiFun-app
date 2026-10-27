// Optional instant UPI payouts through RazorpayX (beta: test with RazorpayX test keys before going live).
// Used only when RAZORPAYX_ACCOUNT_NUMBER is set and the admin setting auto_payout_max_paise > 0.
import { config } from './config.js';
import { db, now } from './db.js';
import { emitUser } from './realtime.js';

async function rzp(path, body, idem) {
  const auth = Buffer.from(`${config.razorpayKeyId}:${config.razorpaySecret}`).toString('base64');
  const headers = { 'content-type': 'application/json', authorization: `Basic ${auth}` };
  if (idem) headers['X-Payout-Idempotency'] = idem;
  const res = await fetch(`https://api.razorpay.com/v1${path}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.description || `RazorpayX ${res.status}`);
  return data;
}

export async function autoPayout(withdrawalId) {
  if (!config.razorpayxAccount || !config.razorpayKeyId) return null;
  const w = await db.one("SELECT w.*, u.name, u.phone FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.id = ? AND w.status = 'requested'", [withdrawalId]);
  if (!w || w.method !== 'upi') return null;
  await db.q("UPDATE withdrawals SET status = 'processing' WHERE id = ?", [w.id]);
  try {
    const contact = await rzp('/contacts', { name: w.name, type: 'vendor', reference_id: w.user_id, contact: /^\d{10}$/.test(w.phone || '') ? w.phone : undefined });
    const fa = await rzp('/fund_accounts', { contact_id: contact.id, account_type: 'vpa', vpa: { address: w.account } });
    const p = await rzp('/payouts', {
      account_number: config.razorpayxAccount, fund_account_id: fa.id, amount: Number(w.amount_paise), currency: 'INR',
      mode: 'UPI', purpose: 'payout', queue_if_low_balance: true, reference_id: w.id, narration: 'Host earnings',
    }, w.id);
    const paid = p.status === 'processed';
    await db.q('UPDATE withdrawals SET status = ?, payout_ref = ?, decided_at = ? WHERE id = ?', [paid ? 'paid' : 'processing', p.id, now(), w.id]);
    if (paid) emitUser(w.user_id, 'notify', { type: 'withdraw', text: 'Your UPI payout was sent' });
    return p;
  } catch (e) {
    // fall back to the manual queue so finance can pay it by hand
    await db.q("UPDATE withdrawals SET status = 'requested', note = ? WHERE id = ?", [`Auto payout failed: ${e.message}`.slice(0, 200), w.id]);
    throw e;
  }
}
