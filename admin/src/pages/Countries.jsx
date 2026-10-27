// Countries: currency, coin price, host payout rate, payment and payout methods. Turn a country on when you launch there.
import { useState } from 'react';
import { api, Badge, Modal, PageHead, Table, useLoad, useToast } from '../lib.jsx';

const FIELDS = [
  ['code', 'Country code (2 letters)', 'text'], ['name', 'Name', 'text'], ['dial_code', 'Phone code (without +)', 'text'],
  ['currency', 'Currency (ISO, e.g. AED)', 'text'], ['symbol', 'Symbol shown in app', 'text'],
  ['coins_per_unit', 'Coins per 1 unit of currency (sets gift prices)', 'number'], ['diamonds_per_unit', 'Diamonds per 1 unit on withdrawal (sets host share)', 'number'],
  ['payment_methods', 'Payment methods shown (comma separated)', 'list'], ['payout_methods', 'Payout methods (upi, bank, bank_intl, paypal, payoneer, wise)', 'list'],
  ['default_language', 'Default app language (hi / en / ar)', 'text'], ['region', 'Region for local gifts (SASIA, GCC, SEA, WEST)', 'text'],
  ['active', 'Open for sign-ups (1/0)', 'number'], ['sort', 'Sort', 'number'],
];

export default function Countries() {
  const { data, reload } = useLoad('/admin/countries');
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  const save = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    for (const [k, , t] of FIELDS) if (t === 'list') fd[k] = String(fd[k] || '').split(',').map((x) => x.trim()).filter(Boolean);
    const code = (fd.code || edit.code || '').toUpperCase();
    delete fd.code;
    try { await api(`/admin/countries/${code}`, { method: 'PUT', body: fd }); toast('Saved'); setEdit(null); reload(); } catch (x) { toast(x.message, 'err'); }
  };
  return (
    <>
      <PageHead title="Countries" sub="Launch one country at a time. Check exchange rates and taxes before opening a country.">
        <button className="btn primary" onClick={() => setEdit({})}>Add country</button>
      </PageHead>
      <div className="panel muted small">
        Prices: a gift of 1,000 coins costs 1000 ÷ “coins per unit” in local money. Host share: diamonds ÷ “diamonds per unit”.
        Payments outside India need International Payments on Razorpay (cards), or a local gateway for mada / STC Pay / GCash etc.
      </div>
      <Table rows={data} onRow={setEdit} cols={[
        { h: '', r: (c) => <span style={{ fontSize: 20 }}>{String(c.code).replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))}</span> },
        { h: 'Country', r: (c) => <b>{c.name}</b> }, { h: 'Phone', r: (c) => `+${c.dial_code}` }, { h: 'Currency', r: (c) => `${c.currency} (${c.symbol.trim()})` },
        { h: '1,000 coins cost', r: (c) => `${c.symbol}${(1000 / c.coins_per_unit).toFixed(2)}` },
        { h: '10,000 diamonds pay', r: (c) => `${c.symbol}${(10000 / c.diamonds_per_unit).toFixed(2)}` },
        { h: 'Payment', r: (c) => c.payment_methods.join(', ') }, { h: 'Payout', r: (c) => c.payout_methods.join(', ') },
        { h: 'Lang', k: 'default_language' }, { h: 'Region', k: 'region' },
        { h: 'Status', r: (c) => <Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'open' : 'closed'}</Badge> },
      ]} />
      {edit && (
        <Modal title={edit.code ? `Edit ${edit.name}` : 'Add country'} onClose={() => setEdit(null)}>
          <form className="form" onSubmit={save}>
            {FIELDS.map(([k, label, t]) => (k === 'code' && edit.code ? null : (
              <label key={k}>{label}<input name={k} type={t === 'number' ? 'number' : 'text'} step="any" defaultValue={Array.isArray(edit[k]) ? edit[k].join(', ') : edit[k] ?? ''} required={['code', 'name', 'dial_code', 'currency', 'symbol', 'coins_per_unit', 'diamonds_per_unit'].includes(k)} /></label>
            )))}
            <button className="btn primary">Save</button>
          </form>
        </Modal>
      )}
    </>
  );
}
