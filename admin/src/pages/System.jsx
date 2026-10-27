import { useState } from 'react';
import { api, dt, PageHead, Table, useLoad, useToast } from '../lib.jsx';

const LABELS = {
  app_name: 'App name',
  coins_per_rupee: 'Coins per ₹1 (display only)',
  diamonds_per_rupee: 'Diamonds per ₹1 on withdrawal (sets host share)',
  min_withdraw_diamonds: 'Minimum withdrawal (diamonds)',
  pk_duration_sec: 'PK battle length (seconds)',
  banner_threshold_coins: 'Global banner when a gift is worth ≥ coins',
  new_user_bonus_coins: 'Signup bonus coins',
  new_host_bonus_pct: 'Agency bonus % on new hosts (first 30 days)',
  heartbeat_timeout_sec: 'Close a live after host is silent for (seconds)',
  max_audio_seats: 'Seats in party rooms',
  host_auto_approve: 'Auto-approve host applications (1 = yes, 0 = review)',
  gift_confirm_coins: 'Ask “are you sure?” for a single gift send worth ≥ coins',
  refund_window_hours: 'Accidental recharge refund window (hours)',
  refund_max_per_30d: 'Max refund requests per user per 30 days',
  limit_raise_delay_hours: 'Raising your own daily limit takes effect after (hours)',
  require_kyc_to_go_live: 'Hosts must pass ID + live selfie check to go live (1/0)',
  live_check_minutes: '“I am live” check every N minutes (0 = off; 2 misses end the live)',
  snapshot_sec: 'Live wall frame every N seconds (0 = off)',
  ai_moderation: 'AI moderation of frames and chat (needs ANTHROPIC_API_KEY) (1/0)',
  ai_auto_end: 'Let AI end a live on high-confidence nudity (1/0; 0 = flag for a moderator)',
  chat_strikes_to_mute: 'Auto-mute a user in a room after N chat strikes',
  auto_payout_max_paise: 'Instant UPI payout for verified hosts up to (paise, needs RazorpayX; 0 = off)',
};

export default function System() {
  const toast = useToast();
  const { data, reload } = useLoad('/admin/settings');
  const admins = useLoad('/admin/admins');
  const audit = useLoad('/admin/audit');
  const [f, setF] = useState({ email: '', password: '', name: '', role: 'moderator' });
  const save = async (e) => {
    e.preventDefault();
    try { await api('/admin/settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }); toast('Settings saved'); reload(); } catch (x) { toast(x.message, 'err'); }
  };
  const addAdmin = async (e) => {
    e.preventDefault();
    try { await api('/admin/admins', { method: 'POST', body: f }); toast('Admin added'); admins.reload(); setF({ email: '', password: '', name: '', role: 'moderator' }); } catch (x) { toast(x.message, 'err'); }
  };
  const deleteAdmin = async (a) => {
    if (!window.confirm(`Delete admin ${a.name || a.email} (${a.email})?`)) return;
    try {
      await api(`/admin/admins/${a.id}`, { method: 'DELETE' });
      toast('Admin removed');
      admins.reload();
    } catch (x) {
      toast(x.message, 'err');
    }
  };
  return (
    <>
      <PageHead title="Settings & admins" />
      {data && (
        <form className="panel form grid-form" onSubmit={save}>
          <h3>App settings</h3>
          {Object.keys(LABELS).map((k) => <label key={k}>{LABELS[k]}<input name={k} defaultValue={data.values[k]} /></label>)}
          <button className="btn primary">Save settings</button>
        </form>
      )}
      <div className="panel">
        <h3>Admin team</h3>
        <Table rows={admins.data} cols={[
          { h: 'Name', k: 'name' },
          { h: 'Email', k: 'email' },
          { h: 'Role', k: 'role' },
          { h: 'Added', r: (a) => dt(a.created_at) },
          { h: '', r: (a) => <button className="btn small danger" onClick={() => deleteAdmin(a)}>Remove</button> }
        ]} />
        <form className="inline" onSubmit={addAdmin}>
          <input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input placeholder="Password (8+)" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="moderator">Moderator</option><option value="support">Support</option><option value="finance">Finance</option><option value="super">Super admin</option></select>
          <button className="btn primary">Add admin</button>
        </form>
      </div>
      <div className="panel">
        <h3>Audit log</h3>
        <Table rows={audit.data} cols={[{ h: 'When', r: (a) => dt(a.created_at) }, { h: 'Action', k: 'action' }, { h: 'Target', k: 'target' }, { h: 'Detail', r: (a) => <code className="clip">{a.detail}</code> }]} />
      </div>
    </>
  );
}
