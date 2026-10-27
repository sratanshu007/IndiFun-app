import { useState } from 'react';
import { api, Badge, dt, fmt, Modal, PageHead, Table, useLoad, useToast } from '../lib.jsx';

export default function Agencies() {
  const { data, reload } = useLoad('/admin/agencies');
  const levels = useLoad('/admin/agency-levels');
  const toast = useToast();
  const [login, setLogin] = useState(null);
  const [filter, setFilter] = useState('');
  const status = async (a, s) => {
    try { await api(`/admin/agencies/${a.id}/status`, { method: 'POST', body: { status: s } }); toast(`Agency ${s}`); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  const update = async (a, patch) => {
    try { await api(`/admin/agencies/${a.id}`, { method: 'PUT', body: patch }); toast('Updated'); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  const rows = data?.filter((a) => !filter || a.status === filter);
  return (
    <>
      <PageHead title="Agencies" sub="Agencies recruit hosts and earn 4–10% commission from the platform share." />
      <div className="filters">{[['', 'All'], ['pending', 'Applications'], ['active', 'Active'], ['suspended', 'Suspended']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div>
      <Table rows={rows} empty="No agencies" cols={[
        { h: 'Agency', r: (a) => <><b>{a.name}</b><br /><small>Code {a.code} · {a.city || '—'} · {a.phone || ''}</small></> },
        { h: 'Owner', r: (a) => `${a.owner_name} (${a.owner_pid})` },
        { h: 'Hosts', right: true, r: (a) => fmt(a.hosts) },
        { h: 'Level', r: (a) => <select value={a.level} onChange={(e) => update(a, { level: Number(e.target.value) })}>{(levels.data || []).map((l) => <option key={l.level} value={l.level}>L{l.level} · {l.pct}%</option>)}</select> },
        { h: 'Settlement', r: (a) => <select value={a.settlement_mode} onChange={(e) => update(a, { settlement_mode: e.target.value })}><option value="direct">Direct</option><option value="agency">Via agency</option></select> },
        { h: 'Status', r: (a) => <Badge tone={a.status === 'active' ? 'green' : a.status === 'pending' ? 'amber' : 'red'}>{a.status}</Badge> },
        { h: 'Created', r: (a) => dt(a.created_at) },
        { h: '', r: (a) => (
          <span className="row-actions">
            {a.status !== 'active' && <button className="btn small primary" onClick={() => status(a, 'active')}>Approve</button>}
            {a.status === 'active' && <button className="btn small danger" onClick={() => status(a, 'suspended')}>Suspend</button>}
            {a.status === 'pending' && <button className="btn small" onClick={() => status(a, 'rejected')}>Reject</button>}
            <button className="btn small" onClick={() => setLogin(a)}>Panel login</button>
          </span>
        ) },
      ]} />
      <Levels levels={levels} />
      {login && <LoginForm agency={login} onClose={() => setLogin(null)} />}
    </>
  );
}

function Levels({ levels }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const data = rows || levels.data;
  if (!data) return null;
  const set = (i, k, v) => setRows(data.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const save = async () => {
    try { await api('/admin/agency-levels', { method: 'PUT', body: { levels: data } }); toast('Levels saved'); levels.reload(); setRows(null); } catch (e) { toast(e.message, 'err'); }
  };
  const recalc = async () => { try { await api('/admin/agency-levels/recalc', { method: 'POST' }); toast('Levels recalculated from last 30 days'); } catch (e) { toast(e.message, 'err'); } };
  return (
    <div className="panel">
      <h3>Agency levels</h3>
      <p className="muted">Recalculated automatically on the 1st of every month from the last 30 days.</p>
      <Table rows={data} cols={[
        { h: 'Level', r: (l) => `L${l.level}` },
        { h: 'Min monthly host diamonds', r: (l) => <input type="number" value={l.min_diamonds} onChange={(e) => set(data.indexOf(l), 'min_diamonds', e.target.value)} /> },
        { h: 'Min active hosts', r: (l) => <input type="number" value={l.min_hosts} onChange={(e) => set(data.indexOf(l), 'min_hosts', e.target.value)} /> },
        { h: 'Commission %', r: (l) => <input type="number" step="0.5" value={l.pct} onChange={(e) => set(data.indexOf(l), 'pct', e.target.value)} /> },
      ]} />
      <div className="row-actions"><button className="btn primary" onClick={save}>Save levels</button><button className="btn" onClick={recalc}>Recalculate now</button></div>
    </div>
  );
}

function LoginForm({ agency, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ email: '', password: '' });
  const save = async (e) => {
    e.preventDefault();
    try { await api(`/admin/agencies/${agency.id}/login`, { method: 'POST', body: f }); toast('Login created. Share it with the agency.'); onClose(); } catch (x) { toast(x.message, 'err'); }
  };
  return (
    <Modal title={`Panel login for ${agency.name}`} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password (8+ characters)<input required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button className="btn primary">Create login</button>
      </form>
    </Modal>
  );
}
