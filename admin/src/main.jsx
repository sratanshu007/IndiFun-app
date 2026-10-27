import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { api, getSession, setSession, ToastProvider } from './lib.jsx';
import './admin.css';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import Rooms from './pages/Rooms.jsx';
import Catalog from './pages/Catalog.jsx';
import Finance from './pages/Finance.jsx';
import Agencies from './pages/Agencies.jsx';
import Reports from './pages/Reports.jsx';
import System from './pages/System.jsx';
import AgencyPanel from './pages/AgencyPanel.jsx';
import Trust from './pages/Trust.jsx';
import Countries from './pages/Countries.jsx';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/auth/admin/login', { method: 'POST', body: { email, password } });
      setSession(r);
      onLogin(r);
    } catch (x) { setErr(x.message); }
  };
  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit}>
        <div className="logo">Indi Fun <span>Admin</span></div>
        <p className="muted">Admins and agencies sign in here.</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoFocus /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
        {err && <div className="error">{err}</div>}
        <button className="btn primary">Sign in</button>
      </form>
    </div>
  );
}

const MENU = [
  ['/', 'Dashboard', ['super', 'finance', 'moderator', 'support']],
  ['/users', 'Users & hosts', ['super', 'finance', 'moderator', 'support']],
  ['/rooms', 'Live monitor', ['super', 'moderator', 'support', 'finance']],
  ['/reports', 'Reports', ['super', 'moderator', 'support']],
  ['/trust', 'Trust & safety', ['super', 'moderator', 'support', 'finance']],
  ['/catalog', 'Gifts & store', ['super', 'finance', 'moderator', 'support']],
  ['/finance', 'Recharge & payouts', ['super', 'finance']],
  ['/agencies', 'Agencies', ['super', 'finance', 'moderator', 'support']],
  ['/countries', 'Countries', ['super', 'finance']],
  ['/system', 'Settings & admins', ['super']],
];

function App() {
  const [s, setS] = useState(getSession());
  if (!s) return <Login onLogin={setS} />;
  const role = s.admin.role;
  const logout = () => { setSession(null); setS(null); };
  if (role === 'agency') {
    return (
      <div className="layout">
        <aside className="side">
          <div className="logo">Indi Fun <span>Agency</span></div>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/hosts">Hosts</NavLink>
          <NavLink to="/settlements">Commission</NavLink>
          <div className="side-foot"><b>{s.admin.agency?.name}</b><small>Code {s.admin.agency?.code}</small><button onClick={logout}>Sign out</button></div>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<AgencyPanel view="dashboard" />} />
            <Route path="/hosts" element={<AgencyPanel view="hosts" />} />
            <Route path="/settlements" element={<AgencyPanel view="settlements" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    );
  }
  return (
    <div className="layout">
      <aside className="side">
        <div className="logo">Indi Fun <span>Admin</span></div>
        {MENU.filter((m) => m[2].includes(role)).map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        <div className="side-foot"><b>{s.admin.name}</b><small>{role}</small><button onClick={logout}>Sign out</button></div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/system" element={<System />} />
          <Route path="/trust" element={<Trust />} />
          <Route path="/countries" element={<Countries />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/admin">
      <ToastProvider><App /></ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
