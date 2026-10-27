import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { playVap } from './vapPlayer.js';

const KEY = 'liveapp_admin';
export function getSession() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function setSession(s) {
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function getApiBase() {
  if (typeof window !== 'undefined') {
    if (window.__API_URL__) return window.__API_URL__.replace(/\/$/, '');
    try {
      const stored = localStorage.getItem('liveapp_admin_api_url') || localStorage.getItem('liveapp_api_url');
      if (stored) return stored.replace(/\/$/, '');
    } catch { /* ignore */ }
  }
  try {
    if (import.meta?.env?.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  } catch { /* ignore */ }
  return '';
}

export function adminMediaUrl(path) {
  const base = getApiBase();
  const token = getSession()?.token || '';
  const sep = path.includes('?') ? '&' : '?';
  return `${base}/api/admin${path}${token ? `${sep}t=${encodeURIComponent(token)}` : ''}`;
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const s = getSession();
  const headers = {};
  if (s?.token) headers.authorization = `Bearer ${s.token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const base = getApiBase();
  const res = await fetch(`${base}/api${path}`, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (res.status === 401) { setSession(null); window.location.reload(); }
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

export const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
export const rs = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const dt = (t) => (t ? new Date(Number(t)).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// ---------- toast ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const toast = useCallback((text, kind = 'ok') => {
    const id = Math.random();
    setList((l) => [...l, { id, text, kind }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3500);
  }, []);
  return <ToastCtx.Provider value={toast}>{children}<div className="toasts">{list.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}</div></ToastCtx.Provider>;
}

// ---------- data hook ----------
export function useLoad(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(() => {
    if (!path) return;
    api(path).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, reload, setData };
}

// ---------- UI pieces ----------
export function Table({ cols, rows, empty = 'Nothing here yet', onRow }) {
  if (!rows) return <div className="loading">Loading…</div>;
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{cols.map((c) => <th key={c.k || c.h} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id || r.level || i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'click' : ''}>
            {cols.map((c) => <td key={c.k || c.h} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.r ? c.r(r) : r[c.k]}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  return <div className={`stat ${tone || ''}`}><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
}

export function Badge({ children, tone = 'gray' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function PageHead({ title, sub, children }) {
  return <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="actions">{children}</div></div>;
}

// Simple bar chart (no chart library needed).
export function Bars({ data, valueKey, labelKey, format = fmt, color = 'var(--accent)' }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey])));
  return (
    <div className="bars">
      {data.map((d) => (
        <div key={d[labelKey]} className="bar-col" title={`${d[labelKey]}: ${format(d[valueKey])}`}>
          <div className="bar" style={{ height: `${(Number(d[valueKey]) / max) * 100}%`, background: color }} />
          <span>{String(d[labelKey]).slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

// Lottie preview for gift / store animations.
let lottieP;
export function AnimPreview({ src, loop = true, size = 160, type }) {
  const ref = useRef();
  const isVap = type === 'vap' || (/\.mp4($|\?)/.test(src || '') && type !== 'video');
  useEffect(() => {
    if (src && isVap && ref.current) return playVap(ref.current, src, { loop: true });
    return undefined;
  }, [src, isVap]);
  useEffect(() => {
    if (!src || isVap || !/\.json($|\?)/.test(src)) return undefined;
    let a; let dead = false;
    lottieP ||= import('lottie-web/build/player/lottie_svg').then((m) => m.default || m);
    Promise.all([lottieP, fetch(src).then((r) => r.json())]).then(([lottie, data]) => {
      if (dead) return;
      a = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop, autoplay: true, animationData: data });
    }).catch(() => {});
    return () => { dead = true; a?.destroy(); };
  }, [src, loop]);
  if (!src) return null;
  if (isVap) return <div ref={ref} className="anim-box" style={{ width: size, height: size * 1.4 }} />;
  if (!/\.json($|\?)/.test(src)) return <div className="anim-box" style={{ width: size, height: size }}><small>{src.split('/').pop()}</small></div>;
  return <div ref={ref} className="anim-box" style={{ width: size, height: size }} />;
}
