import { Link } from 'react-router-dom';
import { Bars, fmt, PageHead, rs, Stat, useLoad } from '../lib.jsx';

export default function Dashboard() {
  const { data: d } = useLoad('/admin/dashboard');
  if (!d) return <div className="loading">Loading…</div>;
  const giftRupees = (coins) => rs((coins / 10) * 100);
  return (
    <>
      <PageHead title="Dashboard" sub="Last 24 hours unless marked" />
      <div className="stats">
        <Stat label="Live now" value={fmt(d.liveNow)} sub={`${fmt(d.viewersNow)} watching`} tone="pink" />
        <Stat label="Recharge (24h)" value={rs(d.recharge24hPaise)} tone="green" />
        <Stat label="Gifts sent (24h)" value={`${fmt(d.giftCoins24h)} coins`} sub={`≈ ${giftRupees(d.giftCoins24h)}`} />
        <Stat label="New users (24h)" value={fmt(d.newUsers24h)} sub={`${fmt(d.users)} total · ${fmt(d.hosts)} hosts`} />
      </div>
      <div className="stats">
        <Link to="/finance"><Stat label="Pending withdrawals" value={fmt(d.pendingWithdrawals)} sub={rs(d.pendingWithdrawalPaise)} tone={d.pendingWithdrawals ? 'amber' : ''} /></Link>
        <Link to="/reports"><Stat label="Open reports" value={fmt(d.openReports)} tone={d.openReports ? 'red' : ''} /></Link>
        <Link to="/agencies"><Stat label="Agency applications" value={fmt(d.pendingAgencies)} tone={d.pendingAgencies ? 'amber' : ''} /></Link>
      </div>
      <div className="grid2">
        <div className="panel"><h3>Recharge revenue, last 14 days</h3><Bars data={d.days} valueKey="rechargePaise" labelKey="day" format={rs} color="#22c55e" /></div>
        <div className="panel"><h3>Coins gifted, last 14 days</h3><Bars data={d.days} valueKey="giftCoins" labelKey="day" color="#ff3d77" /></div>
        <div className="panel"><h3>New users, last 14 days</h3><Bars data={d.days} valueKey="newUsers" labelKey="day" color="#7b2cff" /></div>
      </div>
    </>
  );
}
