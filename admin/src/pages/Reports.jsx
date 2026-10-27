import { useState } from 'react';
import { api, Badge, dt, PageHead, Table, useLoad, useToast } from '../lib.jsx';

export default function Reports() {
  const [status, setStatus] = useState('open');
  const { data, reload } = useLoad(`/admin/reports?status=${status}`);
  const toast = useToast();
  const resolve = async (r, action) => {
    try {
      if (action === 'ban' && r.target_type === 'user') await api(`/admin/users/${r.target_id}/ban`, { method: 'POST', body: { days: 30, reason: r.reason } });
      if (action === 'ban' && r.target_type === 'room' && r.target) await api(`/admin/users/${r.target.host_id}/ban`, { method: 'POST', body: { days: 30, reason: r.reason } });
      if (action === 'end' && r.target_type === 'room') await api(`/admin/rooms/${r.target_id}/end`, { method: 'POST', body: { reason: r.reason } });
      await api(`/admin/reports/${r.id}/resolve`, { method: 'POST', body: { action } });
      toast('Report closed');
      reload();
    } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <PageHead title="Reports" sub="Review within 24 hours (IT Rules grievance timelines)." />
      <div className="filters"><button className={status === 'open' ? 'on' : ''} onClick={() => setStatus('open')}>Open</button><button className={status === 'closed' ? 'on' : ''} onClick={() => setStatus('closed')}>Closed</button></div>
      <Table rows={data} empty="No reports" cols={[
        { h: 'When', r: (r) => dt(r.created_at) },
        { h: 'Type', r: (r) => <Badge tone={r.target_type === 'room' ? 'pink' : 'blue'}>{r.target_type}</Badge> },
        { h: 'Target', r: (r) => (r.target_type === 'user' ? `${r.target?.name} (${r.target?.publicId})` : r.target ? <a href={`/live/${r.target.id}`} target="_blank" rel="noreferrer">{r.target.title} · {r.target.status}</a> : r.target_id) },
        { h: 'Reason', r: (r) => <b>{r.reason}</b> }, { h: 'By', k: 'reporter_name' },
        { h: '', r: (r) => (r.status === 'open' ? (
          <span className="row-actions">
            <button className="btn small" onClick={() => resolve(r, 'dismissed')}>Dismiss</button>
            {r.target_type === 'room' && <button className="btn small" onClick={() => resolve(r, 'end')}>End live</button>}
            <button className="btn small danger" onClick={() => resolve(r, 'ban')}>Ban 30 days</button>
          </span>
        ) : <small>{r.action}</small>) },
      ]} />
    </>
  );
}
