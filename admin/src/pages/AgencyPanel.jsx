import { useState } from 'react';
import { api, Badge, Bars, dt, fmt, Modal, PageHead, Stat, Table, useLoad, useToast } from '../lib.jsx';

export default function AgencyPanel({ view }) {
  if (view === 'hosts') return <Hosts />;
  if (view === 'settlements') return <Settlements />;
  return <Dashboard />;
}

function Dashboard() {
  const { data: d } = useLoad('/agency-panel/dashboard');
  if (!d) return <div className="loading">Loading…</div>;
  const next = d.nextLevel;
  return (
    <>
      <PageHead title={d.agency.name} sub={`Agency code ${d.agency.code} · Level ${d.agency.level} · ${d.commission.pct}% commission`} />
      <div className="stats">
        <Stat label="Host diamonds today" value={fmt(d.diamonds.today)} tone="pink" />
        <Stat label="Last 7 days" value={fmt(d.diamonds.week)} />
        <Stat label="Last 30 days" value={fmt(d.diamonds.month)} />
        <Stat label="Commission this week (est.)" value={fmt(d.commission.weekEstimate)} sub="diamonds" tone="green" />
      </div>
      <div className="stats">
        <Stat label="Hosts" value={fmt(d.hosts)} />
        <Stat label="Live now" value={fmt(d.liveNow)} tone={d.liveNow ? 'pink' : ''} />
        {next && <Stat label={`Next level L${next.level} (${next.pct}%)`} value={`${Math.min(100, Math.round((d.diamonds.month / Math.max(1, next.minDiamonds)) * 100))}%`} sub={`${fmt(next.minDiamonds)} diamonds/month and ${next.minHosts} active hosts`} />}
      </div>
      <div className="grid2">
        <div className="panel"><h3>Host diamonds per day</h3><Bars data={d.chart} valueKey="diamonds" labelKey="day" color="#ff3d77" /></div>
        <div className="panel"><h3>Live hours per day</h3><Bars data={d.chart} valueKey="hours" labelKey="day" color="#7b2cff" format={(v) => `${v} h`} /></div>
      </div>
    </>
  );
}

function Hosts() {
  const { data, reload } = useLoad('/agency-panel/hosts');
  const toast = useToast();
  const [pid, setPid] = useState('');
  const [open, setOpen] = useState(null);
  const invite = async (e) => {
    e.preventDefault();
    try { await api('/agency-panel/invite', { method: 'POST', body: { publicId: pid } }); toast('Invite sent. The host accepts it in the app.'); setPid(''); reload(); } catch (x) { toast(x.message, 'err'); }
  };
  const remove = async (h) => {
    if (!window.confirm(`Remove ${h.name} from your agency?`)) return;
    try { await api(`/agency-panel/hosts/${h.id}`, { method: 'DELETE' }); toast('Removed'); reload(); } catch (x) { toast(x.message, 'err'); }
  };
  return (
    <>
      <PageHead title="Hosts" sub="Valid day = at least 1 hour live. 7 valid days a month makes an active host.">
        <form className="search" onSubmit={invite}><input placeholder="Host's 8-digit ID" value={pid} onChange={(e) => setPid(e.target.value.replace(/\D/g, ''))} /><button className="btn primary">Invite</button></form>
      </PageHead>
      <Table rows={data} empty="No hosts yet. Share your agency code or invite by ID." onRow={(h) => setOpen(h)} cols={[
        { h: 'Host', r: (h) => <><b>{h.name}</b> {h.liveRoom && <Badge tone="pink">LIVE</Badge>}<br /><small>ID {h.publicId} · Host Lv{h.hostLevel}</small></> },
        { h: 'Status', r: (h) => <Badge tone={h.status === 'active' ? 'green' : 'amber'}>{h.status}</Badge> },
        { h: 'Hours (30d)', right: true, r: (h) => h.hours30 }, { h: 'Valid days', right: true, k: 'validDays' },
        { h: 'Diamonds (30d)', right: true, r: (h) => <b>{fmt(h.diamonds30)}</b> }, { h: 'Last live', r: (h) => dt(h.lastLive) },
        { h: '', r: (h) => <button className="btn small danger" onClick={(e) => { e.stopPropagation(); remove(h); }}>Remove</button> },
      ]} />
      {open && <HostDetail host={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function HostDetail({ host, onClose }) {
  const { data } = useLoad(`/agency-panel/hosts/${host.id}`);
  return (
    <Modal title={`${host.name} · ID ${host.publicId}`} onClose={onClose} wide>
      {!data ? <div className="loading">Loading…</div> : (
        <>
          <p className="muted">In your agency since {dt(data.joinedAt)}</p>
          <div className="grid2">
            <div className="panel"><h3>Diamonds per day</h3><Bars data={[...data.daily].reverse()} valueKey="diamonds" labelKey="day" color="#ff3d77" /></div>
            <div className="panel"><h3>Hours per day</h3><Bars data={[...data.daily].reverse()} valueKey="hours" labelKey="day" color="#7b2cff" format={(v) => `${v} h`} /></div>
          </div>
        </>
      )}
    </Modal>
  );
}

function Settlements() {
  const { data } = useLoad('/agency-panel/settlements');
  return (
    <>
      <PageHead title="Commission" sub="Calculated every Monday for the previous week; paid as diamonds to the agency owner's account." />
      <Table rows={data} empty="No settlements yet" cols={[
        { h: 'Week', r: (s) => `${new Date(Number(s.period_start)).toLocaleDateString('en-IN')} – ${new Date(Number(s.period_end) - 1).toLocaleDateString('en-IN')}` },
        { h: 'Host diamonds', right: true, r: (s) => fmt(s.host_diamonds) }, { h: 'Rate', right: true, r: (s) => `${s.pct}%` },
        { h: 'Commission', right: true, r: (s) => <b>{fmt(s.commission)}</b> },
        { h: 'Status', r: (s) => <Badge tone={s.status === 'paid' ? 'green' : 'amber'}>{s.status}</Badge> },
      ]} />
    </>
  );
}
