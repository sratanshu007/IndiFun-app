import { useState } from 'react';
import { adminMediaUrl, api, Badge, dt, fmt, Modal, PageHead, Table, useLoad, useToast } from '../lib.jsx';

const FILTERS = [['', 'All'], ['hosts', 'Hosts'], ['pending_hosts', 'Host applications'], ['vip', 'VIP'], ['banned', 'Banned']];

export default function Users() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);
  const { data, reload } = useLoad(`/admin/users?q=${encodeURIComponent(search)}&filter=${filter}&page=${page}`);
  return (
    <>
      <PageHead title="Users & hosts" sub={data ? `${fmt(data.total)} users` : ''}>
        <form onSubmit={(e) => { e.preventDefault(); setPage(0); setSearch(q); }} className="search">
          <input placeholder="Name, phone or 8-digit ID" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn">Search</button>
        </form>
      </PageHead>
      <div className="filters">{FILTERS.map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => { setFilter(k); setPage(0); }}>{l}</button>)}</div>
      <Table rows={data?.rows} onRow={(r) => setOpen(r.id)} cols={[
        { h: 'User', r: (u) => <div className="user-cell"><img src={u.avatar || '/admin/favicon.svg'} alt="" onError={(e) => { e.target.style.visibility = 'hidden'; }} /><div><b>{u.name}</b><small>ID {u.publicId} · {u.phone}</small></div></div> },
        { h: 'Level', r: (u) => <>Lv{u.level}{u.vip ? <Badge tone="gold">VIP{u.vip}</Badge> : null}</> },
        { h: 'Host', r: (u) => (u.isHost ? <Badge tone="pink">Host Lv{u.hostLevel}</Badge> : u.hostStatus === 'pending' ? <Badge tone="amber">Applied</Badge> : '—') },
        { h: 'Coins', k: 'coins', right: true, r: (u) => fmt(u.coins) },
        { h: 'Diamonds', right: true, r: (u) => fmt(u.diamonds) },
        { h: 'Spent', right: true, r: (u) => fmt(u.coinsSpent) },
        { h: 'Status', r: (u) => <Badge tone={u.status === 'banned' ? 'red' : 'green'}>{u.status}</Badge> },
        { h: 'Joined', r: (u) => dt(u.createdAt) },
      ]} />
      {data && data.total > 50 && (
        <div className="pager"><button className="btn" disabled={!page} onClick={() => setPage(page - 1)}>Prev</button><span>Page {page + 1}</span><button className="btn" disabled={(page + 1) * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</button></div>
      )}
      {open && <UserDrawer id={open} onClose={() => { setOpen(null); reload(); }} />}
    </>
  );
}

function UserDrawer({ id, onClose }) {
  const toast = useToast();
  const { data: d, reload } = useLoad(`/admin/users/${id}`);
  const [adj, setAdj] = useState({ currency: 'coins', amount: '', note: '' });
  const [banDays, setBanDays] = useState('7');
  const act = async (path, body, msg) => {
    try { await api(`/admin/users/${id}/${path}`, { method: 'POST', body }); toast(msg); reload(); }
    catch (e) { toast(e.message, 'err'); }
  };
  if (!d) return <Modal title="User" onClose={onClose}><div className="loading">Loading…</div></Modal>;
  const u = d.user;
  const kyc = d.kyc;
  return (
    <Modal title={`${u.name} · ID ${u.publicId}`} onClose={onClose} wide>
      <div className="kv">
        <div><span>Phone</span><b>{u.phone}</b></div>
        <div><span>DOB</span><b>{u.dob || '—'}</b></div>
        <div><span>Coins</span><b>{fmt(d.wallet.coins)}</b></div>
        <div><span>Diamonds</span><b>{fmt(d.wallet.diamonds)}</b></div>
        <div><span>Spent</span><b>{fmt(u.coinsSpent)}</b></div>
        <div><span>Earned</span><b>{fmt(u.diamondsEarned)}</b></div>
        <div><span>Host Status</span><b><Badge tone={u.hostStatus === 'approved' ? 'green' : u.hostStatus === 'pending' ? 'amber' : u.hostStatus === 'suspended' ? 'red' : 'gray'}>{u.hostStatus}</Badge></b></div>
        <div><span>Account Status</span><b><Badge tone={u.status === 'banned' ? 'red' : 'green'}>{u.status}{u.status === 'banned' ? ` till ${dt(u.banUntil)}` : ''}</Badge></b></div>
      </div>

      {kyc && (
        <div style={{ margin: '16px 0', padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 10px' }}>Host Identity Details (Aadhaar & Live Photo)</h4>
          <div className="kyc-review" style={{ marginBottom: '12px' }}>
            <figure>
              <img src={adminMediaUrl(`/kyc/${u.id}/file/selfie`)} alt="Live selfie" onError={(e) => { e.target.style.display = 'none'; }} />
              <figcaption>Live Selfie · Asked: <b>{kyc.challenge || '—'}</b></figcaption>
            </figure>
            <figure>
              <img src={adminMediaUrl(`/kyc/${u.id}/file/id`)} alt="ID document" onError={(e) => { e.target.style.display = 'none'; }} />
              <figcaption>{String(kyc.doc_type || 'aadhaar').toUpperCase()} ••{kyc.doc_last4} · Name: <b>{kyc.legal_name}</b></figcaption>
            </figure>
          </div>
          <div className="kv">
            <div><span>Name on ID</span><b>{kyc.legal_name || '—'}</b></div>
            <div><span>Doc Type & No</span><b>{String(kyc.doc_type || 'aadhaar').toUpperCase()} •••• {kyc.doc_last4 || ''}</b></div>
            <div><span>Verification Status</span><b><Badge tone={kyc.status === 'approved' ? 'green' : kyc.status === 'pending' ? 'amber' : kyc.status === 'suspended' ? 'red' : 'gray'}>{kyc.status}</Badge></b></div>
            <div><span>Submitted</span><b>{dt(kyc.created_at)}</b></div>
            {kyc.note && <div style={{ gridColumn: '1 / -1' }}><span>Decision Note</span><b>{kyc.note}</b></div>}
          </div>
        </div>
      )}

      <div className="row-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
        {u.hostStatus === 'pending' && (
          <>
            <button className="btn primary" onClick={() => act('host', { action: 'approve' }, 'Host approved & verified ✓')}>Approve host</button>
            <button className="btn danger" onClick={() => { const note = window.prompt('Reason for rejecting host:'); if (note !== null) act('host', { action: 'reject', note }, 'Host rejected'); }}>Reject host</button>
          </>
        )}
        {(u.isHost || u.hostStatus === 'approved') && (
          <button className="btn danger" onClick={() => { const note = window.prompt('Reason for suspending host:'); if (note !== null) act('host', { action: 'suspend', note }, 'Host suspended ⛔'); }}>Suspend host ⛔</button>
        )}
        {u.hostStatus === 'suspended' && (
          <button className="btn primary" onClick={() => { const note = window.prompt('Note for reconsidering/re-approving:'); if (note !== null) act('host', { action: 'reconsider', note }, 'Host reconsidered & approved ✓'); }}>Reconsider & Re-approve Host ✓</button>
        )}
        {u.hostStatus === 'rejected' && (
          <button className="btn primary" onClick={() => { const note = window.prompt('Note for re-approving:'); if (note !== null) act('host', { action: 'reconsider', note }, 'Host approved ✓'); }}>Reconsider Host ✓</button>
        )}
        {u.status === 'banned'
          ? <button className="btn" onClick={() => act('unban', {}, 'Unbanned')}>Unban User</button>
          : <span className="inline"><select value={banDays} onChange={(e) => setBanDays(e.target.value)}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="3650">Permanent</option></select><button className="btn danger" onClick={() => act('ban', { days: Number(banDays), reason: 'admin' }, 'User banned')}>Ban User</button></span>}
      </div>
      <h4>Adjust balance (finance)</h4>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); act('adjust', { ...adj, amount: Number(adj.amount) }, 'Balance updated'); setAdj({ ...adj, amount: '', note: '' }); }}>
        <select value={adj.currency} onChange={(e) => setAdj({ ...adj, currency: e.target.value })}><option value="coins">Coins</option><option value="diamonds">Diamonds</option></select>
        <input placeholder="+500 or -500" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
        <input placeholder="Reason (required)" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
        <button className="btn">Apply</button>
      </form>
      <h4>Wallet history</h4>
      <Table rows={d.ledger} cols={[
        { h: 'When', r: (l) => dt(l.created_at) }, { h: 'Type', k: 'type' }, { h: 'Note', r: (l) => l.note || '' }, { h: 'Currency', k: 'currency' },
        { h: 'Amount', right: true, r: (l) => <span className={l.amount > 0 ? 'plus' : 'minus'}>{l.amount > 0 ? '+' : ''}{fmt(l.amount)}</span> },
        { h: 'Balance', right: true, r: (l) => fmt(l.balance_after) },
      ]} />
      {d.rooms.length > 0 && <>
        <h4>Recent lives</h4>
        <Table rows={d.rooms} cols={[{ h: 'Started', r: (r) => dt(r.started_at) }, { h: 'Type', k: 'type' }, { h: 'Title', k: 'title' }, { h: 'Peak', k: 'peak', right: true }, { h: 'Diamonds', right: true, r: (r) => fmt(r.diamonds) }, { h: 'Status', k: 'status' }]} />
      </>}
    </Modal>
  );
}
