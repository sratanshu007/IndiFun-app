// Trust & safety queues: host ID verification, ban appeals, accidental-recharge refunds, and AI / live-check flags.
import { useState } from 'react';
import { adminMediaUrl, api, Badge, dt, fmt, Modal, PageHead, Stat, Table, useLoad, useToast } from '../lib.jsx';

const img = (path) => adminMediaUrl(path);
const TABS = [['kyc', 'Host verification'], ['flags', 'AI & live-check flags'], ['appeals', 'Ban appeals'], ['refunds', 'Refund requests']];

export default function Trust() {
  const [tab, setTab] = useState('kyc');
  const sum = useLoad('/admin/trust/summary');
  const s = sum.data || {};
  return (
    <>
      <PageHead title="Trust & safety" sub="Verified hosts, fair refunds and fast moderation are what make people trust the app." />
      <div className="stats">
        <Stat label="ID checks waiting" value={fmt(s.kyc)} tone={s.kyc ? 'amber' : ''} />
        <Stat label="Verified hosts" value={fmt(s.kycApproved)} tone="green" />
        <Stat label="Suspended hosts" value={fmt(s.kycSuspended)} tone={s.kycSuspended ? 'red' : ''} />
        <Stat label="Open flags" value={fmt(s.flags)} sub={s.flaggedLive ? `${s.flaggedLive} flagged lives now` : 'no flagged lives'} tone={s.flaggedLive ? 'red' : ''} />
        <Stat label="Ban appeals" value={fmt(s.appeals)} />
        <Stat label="Refund requests" value={fmt(s.refunds)} />
      </div>
      <div className="filters">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'kyc' && <Kyc onChange={sum.reload} />}
      {tab === 'flags' && <Flags onChange={sum.reload} />}
      {tab === 'appeals' && <Appeals onChange={sum.reload} />}
      {tab === 'refunds' && <Refunds onChange={sum.reload} />}
    </>
  );
}

function Kyc({ onChange }) {
  const [status, setStatus] = useState('pending');
  const { data, reload } = useLoad(`/admin/kyc?status=${status}`);
  const [open, setOpen] = useState(null);
  const toast = useToast();

  const decide = async (k, action, approveDirect = false) => {
    let note = '';
    if (action === 'reject') {
      note = window.prompt('What should the host fix? (shown to host)', 'Selfie or Aadhaar photo is not clear. Please retake clearly.');
      if (note === null) return;
      if (!note.trim()) return toast('Please specify a rejection reason', 'err');
    } else if (action === 'suspend') {
      note = window.prompt('Reason for suspending host (shown to host):', 'Violation of host policy or suspicious identity');
      if (note === null) return;
    } else if (action === 'reconsider') {
      note = window.prompt(approveDirect ? 'Note for re-approval (optional):' : 'Note for reopening review (optional):', '');
      if (note === null) return;
    }

    try {
      const body = action === 'reconsider' ? { mode: approveDirect ? 'approve' : 'pending', note } : { note };
      await api(`/admin/kyc/${k.user_id}/${action}`, { method: 'POST', body });
      const msgs = {
        approve: 'Host verified & approved ✓',
        reject: 'Host verification rejected',
        suspend: 'Host suspended ⛔ Live ended if active',
        reconsider: approveDirect ? 'Host reinstated & approved ✓' : 'Reopened for review',
      };
      toast(msgs[action] || 'Action completed');
      setOpen(null);
      reload();
      onChange();
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  const badgeTone = (st) => {
    if (st === 'approved') return 'green';
    if (st === 'pending') return 'amber';
    if (st === 'suspended') return 'red';
    return 'gray';
  };

  return (
    <>
      <div className="filters small">
        {[['pending', 'Pending review'], ['approved', 'Verified hosts'], ['suspended', 'Suspended'], ['rejected', 'Rejected'], ['all', 'All submissions']].map(([x, label]) => (
          <button key={x} className={status === x ? 'on' : ''} onClick={() => setStatus(x)}>{label}</button>
        ))}
      </div>
      <Table rows={data} empty="No host verification records found" onRow={setOpen} cols={[
        { h: 'Submitted', r: (k) => dt(k.created_at) },
        { h: 'User', r: (k) => <div><b>{k.name}</b> <small>(ID {k.public_id} · {k.phone})</small></div> },
        { h: 'Name on ID', k: 'legal_name' },
        { h: 'Country', k: 'country' },
        { h: 'Document', r: (k) => <span><Badge tone="gray">{String(k.doc_type || 'aadhaar').toUpperCase()}</Badge> ••{k.doc_last4 || ''}</span> },
        { h: 'DOB', r: (k) => k.dob || '—' },
        { h: 'Status', r: (k) => <Badge tone={badgeTone(k.status)}>{k.status}</Badge> },
        { h: 'Last decided', r: (k) => (k.decided_at ? dt(k.decided_at) : 'Waiting review') },
      ]} />
      {open && (
        <Modal title={`Host Verification: ${open.name} (ID ${open.public_id})`} onClose={() => setOpen(null)} wide>
          <div className="kyc-review">
            <figure>
              <img src={img(`/kyc/${open.user_id}/file/selfie`)} alt="Live selfie" onError={(e) => { e.target.alt = 'Live selfie file not available'; }} />
              <figcaption>Live Camera Selfie<br />Asked gesture: <b>{open.challenge}</b></figcaption>
            </figure>
            <figure>
              <img src={img(`/kyc/${open.user_id}/file/id`)} alt="Aadhaar / ID Card" onError={(e) => { e.target.alt = 'ID file not available'; }} />
              <figcaption>Government ID ({open.doc_type?.toUpperCase()} ••{open.doc_last4})<br />Legal Name: <b>{open.legal_name}</b></figcaption>
            </figure>
          </div>
          <div className="kv" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <div><span>Host Status</span><b><Badge tone={badgeTone(open.status)}>{open.status}</Badge></b></div>
            <div><span>Name on ID</span><b>{open.legal_name}</b></div>
            <div><span>Doc Type & Number</span><b>{open.doc_type?.toUpperCase()} •••• {open.doc_last4}</b></div>
            <div><span>Registered Phone</span><b>{open.phone}</b></div>
            <div><span>Date of Birth</span><b>{open.dob || 'Not set'}</b></div>
            <div><span>Country</span><b>{open.country || 'IN'}</b></div>
            <div><span>Gesture Asked</span><b>{open.challenge}</b></div>
            <div><span>Submitted</span><b>{dt(open.created_at)}</b></div>
            {open.decided_at && <div><span>Decided At</span><b>{dt(open.decided_at)}</b></div>}
            {open.note && <div style={{ gridColumn: '1 / -1' }}><span>Decision Note</span><b>{open.note}</b></div>}
          </div>
          <ul className="checklist">
            <li>Same face in selfie and Aadhaar/Govt ID photo</li>
            <li>The gesture in the live selfie matches the requested challenge</li>
            <li>Name on ID matches what the applicant entered</li>
            <li>Age on ID is 18+ (profile DOB: {open.dob || '—'})</li>
          </ul>
          <div className="row-actions" style={{ marginTop: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {open.status === 'pending' && (
              <>
                <button className="btn primary" onClick={() => decide(open, 'approve')}>Approve Host ✓</button>
                <button className="btn danger" onClick={() => decide(open, 'reject')}>Reject (Ask to fix)</button>
              </>
            )}
            {open.status === 'approved' && (
              <>
                <button className="btn danger" onClick={() => decide(open, 'suspend')}>Suspend Host ⛔</button>
                <button className="btn" onClick={() => decide(open, 'reject')}>Revoke Host Status</button>
              </>
            )}
            {open.status === 'suspended' && (
              <>
                <button className="btn primary" onClick={() => decide(open, 'reconsider', true)}>Reconsider & Re-approve Host ✓</button>
                <button className="btn" onClick={() => decide(open, 'reconsider', false)}>Reopen for Review</button>
              </>
            )}
            {open.status === 'rejected' && (
              <>
                <button className="btn primary" onClick={() => decide(open, 'reconsider', true)}>Reconsider & Approve Host ✓</button>
                <button className="btn" onClick={() => decide(open, 'reconsider', false)}>Reopen for Review</button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function Flags({ onChange }) {
  const [status, setStatus] = useState('open');
  const { data, reload } = useLoad(`/admin/moderation?status=${status}`);
  const toast = useToast();
  const act = async (ev, action) => {
    try {
      if (action === 'end' && ev.room_id) await api(`/admin/rooms/${ev.room_id}/end`, { method: 'POST', body: { reason: ev.kind } });
      if (action === 'ban' && ev.user_id) await api(`/admin/users/${ev.user_id}/ban`, { method: 'POST', body: { days: 30, reason: ev.kind } });
      await api(`/admin/moderation/${ev.id}/review`, { method: 'POST', body: { action } });
      toast('Done'); reload(); onChange();
    } catch (e) { toast(e.message, 'err'); }
  };
  const detail = (ev) => {
    try { const d = JSON.parse(ev.detail); return d.text ? `“${d.text}” — ${d.reason || ''}` : `${d.category} (${Math.round((d.confidence || 0) * 100)}%) ${d.reason || ''}`; } catch { return ev.detail; }
  };
  return (
    <>
      <div className="filters small">{['open', 'reviewed'].map((x) => <button key={x} className={status === x ? 'on' : ''} onClick={() => setStatus(x)}>{x}</button>)}</div>
      <Table rows={data} empty="Nothing flagged. 🎉" cols={[
        { h: 'When', r: (e) => dt(e.created_at) },
        { h: 'Type', r: (e) => <Badge tone={e.kind === 'ai_image' || e.kind === 'auto_end' ? 'red' : e.kind === 'live_check' ? 'amber' : 'blue'}>{e.kind.replace('_', ' ')}</Badge> },
        { h: 'Severity', r: (e) => <Badge tone={e.severity === 'high' ? 'red' : e.severity === 'medium' ? 'amber' : 'gray'}>{e.severity}</Badge> },
        { h: 'Who', r: (e) => (e.user_name ? `${e.user_name} (${e.public_id})` : '—') }, { h: 'Live', r: (e) => (e.room_title ? `${e.room_title} · ${e.room_status}` : '—') },
        { h: 'Detail', r: (e) => <span className="clip">{detail(e)}</span> },
        { h: 'Frame', r: (e) => (e.image ? <a href={img(`/moderation/${e.id}/image`)} target="_blank" rel="noreferrer"><img className="thumb" src={img(`/moderation/${e.id}/image`)} alt="" /></a> : null) },
        { h: '', r: (e) => (e.status === 'open' ? (
          <span className="row-actions">
            <button className="btn small" onClick={() => act(e, 'clear')}>False alarm</button>
            {e.room_status === 'live' && <button className="btn small" onClick={() => act(e, 'end')}>End live</button>}
            <button className="btn small danger" onClick={() => act(e, 'ban')}>Ban 30d</button>
          </span>
        ) : <small>{e.action}</small>) },
      ]} />
    </>
  );
}

function Appeals({ onChange }) {
  const [status, setStatus] = useState('open');
  const { data, reload } = useLoad(`/admin/appeals?status=${status}`);
  const toast = useToast();
  const act = async (a, action) => {
    const note = window.prompt(action === 'accept' ? 'Note to the user (optional)' : action === 'settle' ? 'Note: earnings will be queued as a withdrawal' : 'Reason (shown to the user)', '');
    if (note === null) return;
    try { await api(`/admin/appeals/${a.id}/${action}`, { method: 'POST', body: { note } }); toast('Done'); reload(); onChange(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <div className="filters small">{['open', 'accepted', 'rejected', 'settled'].map((x) => <button key={x} className={status === x ? 'on' : ''} onClick={() => setStatus(x)}>{x}</button>)}</div>
      <Table rows={data} empty="No appeals" cols={[
        { h: 'When', r: (a) => dt(a.created_at) }, { h: 'User', r: (a) => `${a.name} (${a.public_id})` }, { h: 'Banned until', r: (a) => dt(a.ban_until) },
        { h: 'Appeal', r: (a) => <span className="clip">{a.text}</span> },
        { h: 'Balance', r: (a) => `${fmt(a.wallet.coins)} coins · ${fmt(a.wallet.diamonds)} diamonds` },
        { h: 'Payout to', r: (a) => (a.payout_method ? `${a.payout_method}: ${a.payout_account}` : '—') },
        { h: '', r: (a) => (a.status === 'open' ? (
          <span className="row-actions">
            <button className="btn small primary" onClick={() => act(a, 'accept')}>Unban</button>
            {a.wallet.diamonds > 0 && a.payout_method && <button className="btn small" onClick={() => act(a, 'settle')}>Keep ban, pay earnings</button>}
            <button className="btn small danger" onClick={() => act(a, 'reject')}>Reject</button>
          </span>
        ) : <small>{a.note}</small>) },
      ]} />
    </>
  );
}

function Refunds({ onChange }) {
  const [status, setStatus] = useState('open');
  const { data, reload } = useLoad(`/admin/refunds?status=${status}`);
  const toast = useToast();
  const act = async (r, action) => {
    const note = action === 'reject' ? window.prompt('Reason (shown to the user)', '') : '';
    if (action === 'reject' && !note) return;
    if (action === 'refund' && !window.confirm(r.channel === 'razorpay' ? 'Refund through Razorpay now?' : 'Mark as refunded (pay back manually)?')) return;
    try { await api(`/admin/refunds/${r.id}/${action}`, { method: 'POST', body: { note } }); toast('Done'); reload(); onChange(); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <div className="filters small">{['open', 'refunded', 'rejected'].map((x) => <button key={x} className={status === x ? 'on' : ''} onClick={() => setStatus(x)}>{x}</button>)}</div>
      <p className="muted">Coins from the recharge are held as soon as the user asks, so they cannot be spent meanwhile. Rejecting gives them back.</p>
      <Table rows={data} empty="No refund requests" cols={[
        { h: 'Asked', r: (r) => dt(r.created_at) }, { h: 'Paid', r: (r) => dt(r.paid_at) }, { h: 'User', r: (r) => `${r.name} (${r.public_id})` },
        { h: 'Amount', r: (r) => <b>{r.currency || 'INR'} {(Number(r.amount_paise) / 100).toFixed(2)}</b> }, { h: 'Coins', right: true, r: (r) => fmt(r.coins) },
        { h: 'Reason', k: 'reason' }, { h: 'Via', k: 'channel' },
        { h: '', r: (r) => (r.status === 'open' ? (
          <span className="row-actions"><button className="btn small primary" onClick={() => act(r, 'refund')}>Refund</button><button className="btn small danger" onClick={() => act(r, 'reject')}>Decline</button></span>
        ) : <small>{r.note}</small>) },
      ]} />
    </>
  );
}
