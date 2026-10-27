import { useEffect, useState } from 'react';
import { api, Badge, dt, fmt, getSession, PageHead, Table, useLoad, useToast } from '../lib.jsx';

// The latest frame the host app sent (private, loaded with the admin token). Changes every minute.
const snap = (r) => `/api/admin/rooms/${r.id}/snapshot?t=${encodeURIComponent(getSession()?.token || '')}&v=${r.snapshot_at}`;

export default function Rooms() {
  const [tab, setTab] = useState('live');
  const { data, reload } = useLoad(`/admin/rooms?status=${tab}`);
  const toast = useToast();
  useEffect(() => { const t = setInterval(reload, 10000); return () => clearInterval(t); }, [reload]);
  const end = async (r) => {
    if (!window.confirm(`End ${r.host_name}'s live?`)) return;
    try { await api(`/admin/rooms/${r.id}/end`, { method: 'POST', body: { reason: 'moderation' } }); toast('Live ended'); reload(); } catch (e) { toast(e.message, 'err'); }
  };
  const warn = async (r) => {
    const text = window.prompt('Warning message shown in the room', 'Please follow community guidelines.');
    if (!text) return;
    try { await api(`/admin/rooms/${r.id}/warn`, { method: 'POST', body: { text } }); toast('Warning sent'); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <PageHead title="Live monitor" sub="Live wall: the latest frame from every video live, flagged lives first. Refreshes every 10 seconds." />
      <div className="filters"><button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>Live now</button><button className={tab === 'ended' ? 'on' : ''} onClick={() => setTab('ended')}>Recently ended</button></div>
      {tab === 'live' ? (
        !data ? <div className="loading">Loading…</div> : data.length === 0 ? <div className="empty">Nobody is live</div> : (
          <div className="live-grid">
            {data.map((r) => (
              <div key={r.id} className={`live-card ${r.flagged ? 'flagged' : ''}`}>
                <div className="live-thumb" style={{ backgroundImage: `url(${r.snapshot ? snap(r) : r.cover || r.host_avatar || ''})` }}>
                  <Badge tone="pink">{r.type === 'audio' ? 'PARTY' : 'LIVE'}</Badge>{r.inPk && <Badge tone="amber">PK</Badge>}
                  {r.flagged ? <Badge tone="red">AI flag</Badge> : null}
                  <span className="viewers">{fmt(r.viewers)} watching{r.snapshot_at ? ` · frame ${Math.max(0, Math.round((Date.now() - r.snapshot_at) / 1000))}s ago` : ''}</span>
                </div>
                <b>{r.host_name} {r.host_verified ? <span title="Verified host">✔️</span> : <Badge tone="amber">not verified</Badge>}</b><small>ID {r.host_pid} · {r.host_country} · {r.category} · {r.language} · {r.title}</small>
                {r.ai_note && <small className="flag-note">⚠ {r.ai_note}</small>}
                <small>Since {dt(r.started_at)} · {fmt(r.diamonds)} diamonds</small>
                <div className="row-actions"><a className="btn small" href={`/live/${r.id}`} target="_blank" rel="noreferrer">Watch</a><button className="btn small" onClick={() => warn(r)}>Warn</button><button className="btn small danger" onClick={() => end(r)}>End live</button></div>
              </div>
            ))}
          </div>
        )
      ) : (
        <Table rows={data} cols={[
          { h: 'Host', r: (r) => `${r.host_name} (${r.host_pid})` }, { h: 'Type', k: 'type' }, { h: 'Title', k: 'title' },
          { h: 'Started', r: (r) => dt(r.started_at) }, { h: 'Ended', r: (r) => dt(r.ended_at) },
          { h: 'Peak', right: true, k: 'peak' }, { h: 'Diamonds', right: true, r: (r) => fmt(r.diamonds) },
        ]} />
      )}
    </>
  );
}
