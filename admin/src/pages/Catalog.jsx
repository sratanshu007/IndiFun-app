import { useState } from 'react';
import { AnimPreview, api, Badge, fmt, Modal, PageHead, Table, useLoad, useToast } from '../lib.jsx';

const TABS = [['gifts', 'Gifts'], ['store', 'Entry effects, frames & bubbles'], ['vip', 'VIP tiers'], ['banners', 'Home banners']];

// Field specs: [name, label, type, options]
const GIFT_FIELDS = [
  ['name', 'Name', 'text'], ['coins', 'Price (coins)', 'number'], ['category', 'Category', 'select', ['popular', 'luxury', 'festival', '3d']],
  ['tier', 'Tier (decides how it plays)', 'select', ['small', 'medium', 'large', 'super']], ['anim_type', 'Animation format', 'select', ['lottie', 'vap', 'svga', 'video']],
  ['global_banner', 'Announce in all rooms', 'select', ['0', '1']], ['sort', 'Sort order', 'number'], ['active', 'Active', 'select', ['1', '0']],
  ['region', 'Also show in "Local" tab for (all, SASIA, GCC, SEA, WEST, or country codes like IN,AE)', 'text'],
  ['icon', 'Icon (PNG/WebP)', 'file'], ['anim_url', 'Animation file (.json Lottie, .mp4 3D/VAP alpha video, .svga)', 'file'],
];
const STORE_FIELDS = [
  ['name', 'Name', 'text'], ['type', 'Type', 'select', ['entry', 'frame', 'bubble']], ['price', 'Price (coins)', 'number'], ['days', 'Valid days', 'number'],
  ['anim_type', 'Format', 'select', ['lottie', 'svga', 'video', 'css']], ['vip_only', 'VIP only', 'select', ['0', '1']], ['active', 'Active', 'select', ['1', '0']],
  ['preview', 'Preview image', 'file'], ['anim_url', 'Animation file', 'file'],
];
const BANNER_FIELDS = [['title', 'Title', 'text'], ['link', 'Link inside app (e.g. /rank)', 'text'], ['sort', 'Sort', 'number'], ['active', 'Active', 'select', ['1', '0']], ['image', 'Image 1000×340', 'file']];

function EditForm({ fields, item, path, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.target);
    for (const [k, v] of [...fd.entries()]) if (v instanceof File && !v.size) fd.delete(k);
    try {
      await api(item ? `/admin/${path}/${item.id}` : `/admin/${path}`, { method: item ? 'PUT' : 'POST', form: fd });
      toast('Saved');
      onSaved();
      onClose();
    } catch (x) { toast(x.message, 'err'); }
    setBusy(false);
  };
  return (
    <Modal title={item ? `Edit ${item.name || item.title}` : 'Add new'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        {fields.map(([k, label, type, opts]) => (
          <label key={k}>{label}
            {type === 'select' ? (
              <select name={k} defaultValue={item ? String(item[k] ?? '') : opts[0]}>{opts.map((o) => <option key={o} value={o}>{o === '1' ? 'Yes' : o === '0' ? 'No' : o}</option>)}</select>
            ) : type === 'file' ? (
              <><input type="file" name={k} />{item?.[k] && <small className="muted">Current: {String(item[k]).split('/').pop()}</small>}</>
            ) : (
              <input name={k} type={type} defaultValue={item?.[k] ?? ''} required={k === 'name'} />
            )}
          </label>
        ))}
        {item?.anim_url && <AnimPreview src={item.anim_url} type={item.anim_type} size={180} />}
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </Modal>
  );
}

export default function Catalog() {
  const [tab, setTab] = useState('gifts');
  return (
    <>
      <PageHead title="Gifts & store" sub="Upload new animations here; apps pick them up automatically." />
      <div className="filters">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'gifts' && <Gifts />}
      {tab === 'store' && <StoreItems />}
      {tab === 'vip' && <Vip />}
      {tab === 'banners' && <Banners />}
    </>
  );
}

function Gifts() {
  const { data, reload } = useLoad('/admin/gifts');
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  return (
    <>
      <div className="toolbar"><button className="btn primary" onClick={() => setEdit({})}>+ Add gift</button></div>
      <Table rows={data} cols={[
        { h: '', r: (g) => <img className="thumb" src={g.icon} alt="" /> },
        { h: 'Name', r: (g) => <b>{g.name}</b> }, { h: 'Category', k: 'category' }, { h: 'Local in', r: (g) => (g.region && g.region !== 'all' ? <Badge tone="blue">{g.region}</Badge> : '—') },
        { h: 'Tier', r: (g) => <Badge tone={{ small: 'gray', medium: 'blue', large: 'pink', super: 'gold' }[g.tier]}>{g.tier}</Badge> },
        { h: 'Coins', right: true, r: (g) => fmt(g.coins) }, { h: 'Format', k: 'anim_type' },
        { h: 'Global', r: (g) => (g.global_banner ? 'Yes' : '') }, { h: 'Active', r: (g) => (g.active ? <Badge tone="green">on</Badge> : <Badge>off</Badge>) },
        { h: '', r: (g) => <span className="row-actions"><button className="btn small" onClick={() => setPreview(g)}>Play</button><button className="btn small" onClick={() => setEdit(g)}>Edit</button></span> },
      ]} />
      {edit && <EditForm fields={GIFT_FIELDS} item={edit.id ? edit : null} path="gifts" onClose={() => setEdit(null)} onSaved={reload} />}
      {preview && <Modal title={preview.name} onClose={() => setPreview(null)}><div className="dark-stage"><AnimPreview src={preview.anim_url} type={preview.anim_type} size={300} /></div></Modal>}
    </>
  );
}

function StoreItems() {
  const { data, reload } = useLoad('/admin/store-items');
  const [edit, setEdit] = useState(null);
  return (
    <>
      <div className="toolbar"><button className="btn primary" onClick={() => setEdit({})}>+ Add item</button></div>
      <Table rows={data} cols={[
        { h: 'Preview', r: (s) => (s.type === 'frame' ? <AnimPreview src={s.anim_url} size={60} /> : s.preview ? <img className="thumb wide" src={s.preview} alt="" /> : <code>{s.anim_url}</code>) },
        { h: 'Name', r: (s) => <b>{s.name}</b> }, { h: 'Type', k: 'type' }, { h: 'Price', right: true, r: (s) => fmt(s.price) }, { h: 'Days', k: 'days', right: true },
        { h: 'VIP only', r: (s) => (s.vip_only ? 'Yes' : '') }, { h: 'Active', r: (s) => (s.active ? <Badge tone="green">on</Badge> : <Badge>off</Badge>) },
        { h: '', r: (s) => <button className="btn small" onClick={() => setEdit(s)}>Edit</button> },
      ]} />
      {edit && <EditForm fields={STORE_FIELDS} item={edit.id ? edit : null} path="store-items" onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}

function Vip() {
  const { data, reload } = useLoad('/admin/vip-tiers');
  const items = useLoad('/admin/store-items').data || [];
  const toast = useToast();
  const save = async (t, e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try { await api(`/admin/vip-tiers/${t.level}`, { method: 'PUT', body: { ...f, perks: JSON.stringify(f.perks.split('\n').map((x) => x.trim()).filter(Boolean)) } }); toast('Saved'); reload(); }
    catch (x) { toast(x.message, 'err'); }
  };
  if (!data) return <div className="loading">Loading…</div>;
  return (
    <div className="cards">
      {data.map((t) => (
        <form key={t.level} className="panel form" onSubmit={(e) => save(t, e)}>
          <h3 style={{ color: t.color }}>VIP{t.level}</h3>
          <label>Name<input name="name" defaultValue={t.name} /></label>
          <label>Price (coins)<input name="price" type="number" defaultValue={t.price} /></label>
          <label>Days<input name="days" type="number" defaultValue={t.days} /></label>
          <label>Colour<input name="color" defaultValue={t.color} /></label>
          <label>Free entry effect<select name="entry_item_id" defaultValue={t.entry_item_id || ''}><option value="">None</option>{items.filter((i) => i.type === 'entry').map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
          <label>Perks (one per line)<textarea name="perks" rows={4} defaultValue={(t.perks ? JSON.parse(t.perks) : []).join('\n')} /></label>
          <button className="btn primary">Save</button>
        </form>
      ))}
    </div>
  );
}

function Banners() {
  const { data, reload } = useLoad('/admin/banners');
  const [edit, setEdit] = useState(null);
  return (
    <>
      <div className="toolbar"><button className="btn primary" onClick={() => setEdit({})}>+ Add banner</button></div>
      <Table rows={data} cols={[
        { h: 'Image', r: (b) => <img className="thumb banner" src={b.image} alt="" /> }, { h: 'Title', k: 'title' }, { h: 'Link', k: 'link' },
        { h: 'Active', r: (b) => (b.active ? <Badge tone="green">on</Badge> : <Badge>off</Badge>) }, { h: '', r: (b) => <button className="btn small" onClick={() => setEdit(b)}>Edit</button> },
      ]} />
      {edit && <EditForm fields={BANNER_FIELDS} item={edit.id ? edit : null} path="banners" onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
