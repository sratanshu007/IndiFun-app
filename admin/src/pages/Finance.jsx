import { useState } from 'react';
import { api, Badge, dt, fmt, PageHead, rs, Table, useLoad, useToast } from '../lib.jsx';

export default function Finance() {
  const [tab, setTab] = useState('withdrawals');
  return (
    <>
      <PageHead title="Recharge & payouts" />
      <div className="filters">
        <button className={tab === 'withdrawals' ? 'on' : ''} onClick={() => setTab('withdrawals')}>Host withdrawals</button>
        <button className={tab === 'settlements' ? 'on' : ''} onClick={() => setTab('settlements')}>Agency commission</button>
        <button className={tab === 'packs' ? 'on' : ''} onClick={() => setTab('packs')}>Recharge packs</button>
      </div>
      {tab === 'withdrawals' && <Withdrawals />}
      {tab === 'settlements' && <Settlements />}
      {tab === 'packs' && <Packs />}
    </>
  );
}

function Withdrawals() {
  const [status, setStatus] = useState('requested');
  const { data, reload } = useLoad(`/admin/withdrawals?status=${status}`);
  const toast = useToast();
  const act = async (w, action) => {
    const extra = action === 'paid' ? { ref: window.prompt('Payout reference (UTR / RazorpayX payout id)') } : { reason: window.prompt('Reason for rejecting') };
    if (Object.values(extra)[0] === null) return;
    try { await api(`/admin/withdrawals/${w.id}/${action}`, { method: 'POST', body: extra }); toast(action === 'paid' ? 'Marked paid' : 'Rejected, diamonds returned'); reload(); }
    catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <div className="filters small">{['requested', 'paid', 'rejected'].map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s}</button>)}</div>
      <p className="muted">Pay via RazorpayX / Cashfree Payouts or bank transfer, deduct TDS as applicable, then mark paid with the reference.</p>
      <Table rows={data} empty="No withdrawal requests" cols={[
        { h: 'Requested', r: (w) => dt(w.created_at) }, { h: 'Host', r: (w) => <><b>{w.name}</b><br /><small>ID {w.public_id} · {w.phone}</small></> },
        { h: 'Diamonds', right: true, r: (w) => fmt(w.diamonds) }, { h: 'Amount', right: true, r: (w) => <b>{!w.currency || w.currency === 'INR' ? rs(w.amount_paise) : `${w.currency} ${(Number(w.amount_paise) / 100).toFixed(2)}`}</b> },
        { h: 'Host', r: (w) => (w.verified ? <Badge tone="green">verified</Badge> : <Badge tone="amber">not verified</Badge>) },
        { h: 'State', r: (w) => (w.status === 'processing' ? <Badge tone="blue">auto payout…</Badge> : w.note ? <small>{w.note}</small> : null) },
        { h: 'Pay to', r: (w) => <><Badge>{w.method}</Badge> <code>{w.account}</code></> },
        { h: '', r: (w) => (w.status === 'requested' ? <span className="row-actions"><button className="btn small primary" onClick={() => act(w, 'paid')}>Mark paid</button><button className="btn small danger" onClick={() => act(w, 'reject')}>Reject</button></span> : <small>{w.note}</small>) },
      ]} />
    </>
  );
}

function Settlements() {
  const { data, reload } = useLoad('/admin/settlements');
  const toast = useToast();
  const run = async () => {
    try { const r = await api('/admin/settlements/run', { method: 'POST', body: {} }); toast(`${r.created} settlements created for last week`); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  const pay = async (s) => {
    if (!window.confirm(`Credit ${fmt(s.commission)} diamonds to ${s.agency_name}?`)) return;
    try { await api(`/admin/settlements/${s.id}/pay`, { method: 'POST' }); toast('Commission credited'); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <div className="toolbar"><button className="btn primary" onClick={run}>Calculate last week</button><span className="muted">Runs automatically every Monday. Commission is credited as diamonds to the agency owner, who withdraws like a host.</span></div>
      <Table rows={data} empty="No settlements yet" cols={[
        { h: 'Week', r: (s) => `${new Date(Number(s.period_start)).toLocaleDateString('en-IN')} – ${new Date(Number(s.period_end) - 1).toLocaleDateString('en-IN')}` },
        { h: 'Agency', r: (s) => `${s.agency_name} (${s.code})` }, { h: 'Host diamonds', right: true, r: (s) => fmt(s.host_diamonds) },
        { h: 'Active hosts', right: true, k: 'active_hosts' }, { h: 'Rate', right: true, r: (s) => `${s.pct}%` }, { h: 'Commission', right: true, r: (s) => <b>{fmt(s.commission)}</b> },
        { h: 'Status', r: (s) => <Badge tone={s.status === 'paid' ? 'green' : s.status === 'pending' ? 'amber' : 'gray'}>{s.status}</Badge> },
        { h: '', r: (s) => s.status === 'pending' && <button className="btn small primary" onClick={() => pay(s)}>Pay</button> },
      ]} />
    </>
  );
}

function Packs() {
  const { data: all, reload } = useLoad('/admin/packs');
  const toast = useToast();
  const [cc, setCc] = useState('IN');
  const [form, setForm] = useState({ price_paise: '', coins: '', bonus: '0', sort: '9' });
  const countries = [...new Set((all || []).map((p) => p.country || 'IN'))];
  const data = all && all.filter((p) => (p.country || 'IN') === cc);
  const cur = data?.[0]?.currency || (cc === 'IN' ? 'INR' : '');
  const save = async (p, patch) => {
    const fd = new FormData();
    Object.entries(patch).forEach(([k, v]) => fd.append(k, v));
    try { await api(p ? `/admin/packs/${p.id}` : '/admin/packs', { method: p ? 'PUT' : 'POST', form: fd }); toast('Saved'); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <div className="filters small">{countries.map((c) => <button key={c} className={cc === c ? 'on' : ''} onClick={() => setCc(c)}>{c}</button>)}</div>
      <Table rows={data} cols={[
        { h: 'Price', r: (p) => ((p.currency || 'INR') === 'INR' ? rs(p.price_paise) : `${p.currency} ${(p.price_paise / 100).toFixed(2)}`) }, { h: 'Coins', right: true, r: (p) => fmt(p.coins) }, { h: 'Bonus', right: true, r: (p) => fmt(p.bonus) },
        { h: 'Coins per unit', right: true, r: (p) => ((Number(p.coins) + Number(p.bonus)) / (p.price_paise / 100)).toFixed(1) },
        { h: 'Active', r: (p) => <button className="btn small" onClick={() => save(p, { active: p.active ? 0 : 1 })}>{p.active ? 'Disable' : 'Enable'}</button> },
      ]} />
      <form className="inline panel" onSubmit={(e) => { e.preventDefault(); save(null, { ...form, price_paise: Math.round(Number(form.price_paise) * 100), country: cc, currency: cur || 'INR' }); }}>
        <b>New pack for {cc}</b>
        <input placeholder={`Price ${cur}`} value={form.price_paise} onChange={(e) => setForm({ ...form, price_paise: e.target.value })} />
        <input placeholder="Coins" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} />
        <input placeholder="Bonus coins" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
        <button className="btn primary">Add</button>
      </form>
    </>
  );
}
