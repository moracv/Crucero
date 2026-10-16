import { useState } from 'react';
import { imgUrl, parseItems, remove, save, saveImage, uid, useStore } from '../store';
import type { Item } from '../types';
import { Empty, Field, Header, Modal } from '../components/ui';
import { ProfileSwitch } from '../components/Forms';
import { PhotoInput } from '../components/PhotoInput';
import { catById, CLOTHES } from '../catalog';

function ItemForm({ item, profileId, gender, onClose }: { item?: Item; profileId: string; gender: 'H' | 'M'; onClose: () => void }) {
  const [it, setIt] = useState<Item>(item || { id: uid(), profile_id: profileId, kind: 'ropa', category: 'camisa', name: '', color: '', tags: '', packed: 0, qty: 1 });
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const s = useStore();
  const usedIn = s.outfits.filter((o) => {
    const x = parseItems(o);
    return Object.values(x).some((v) => v === it.id || (Array.isArray(v) && v.includes(it.id)));
  }).length;
  const cats = CLOTHES.filter((c) => !c.for || c.for === gender);

  async function submit() {
    setBusy(true);
    let image_key = it.image_key;
    if (photo) image_key = await saveImage(photo);
    save('items', { ...it, image_key, name: it.name || catById(it.category)?.label });
    onClose();
  }

  return (
    <Modal title={item ? 'Editar prenda' : 'Nueva prenda'} onClose={onClose}>
      <PhotoInput onPhoto={setPhoto} preview={imgUrl(it.image_key)} />
      <Field label="Tipo">
        <select value={it.category} onChange={(e) => setIt({ ...it, category: e.target.value })}>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Nombre"><input value={it.name || ''} onChange={(e) => setIt({ ...it, name: e.target.value })} placeholder="Polo azul marino" /></Field>
      <div className="grid2">
        <Field label="Color"><input value={it.color || ''} onChange={(e) => setIt({ ...it, color: e.target.value })} /></Field>
        <Field label="Estilo / etiquetas"><input value={it.tags || ''} onChange={(e) => setIt({ ...it, tags: e.target.value })} placeholder="playa, formal" /></Field>
      </div>
      {usedIn > 0 && <p className="muted small">Usada en {usedIn} outfit(s).</p>}
      <div className="row">
        {item && <button className="btn danger" onClick={() => { if (confirm(usedIn ? `Está en ${usedIn} outfit(s). ¿Eliminar igual?` : '¿Eliminar prenda?')) { remove('items', it.id); onClose(); } }}>Eliminar</button>}
        <button className="btn primary grow" onClick={submit} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </Modal>
  );
}

export function Catalog() {
  const s = useStore();
  const profile = s.profiles.find((p) => p.id === s.viewProfileId);
  const [filter, setFilter] = useState('todo');
  const [edit, setEdit] = useState<Item | 'new' | null>(null);
  if (!profile) return <div className="page"><Header title="Ropa" /><Empty>Configura los perfiles primero.</Empty></div>;
  const mine = s.items.filter((i) => i.kind === 'ropa' && i.profile_id === profile.id);
  const usedCats = CLOTHES.filter((c) => mine.some((i) => i.category === c.id));
  const list = filter === 'todo' ? mine : mine.filter((i) => i.category === filter);

  return (
    <div className="page">
      <Header title="Catálogo de ropa" sub={`${mine.length} prendas`} right={<button className="btn primary small" onClick={() => setEdit('new')}>+ Prenda</button>} />
      <ProfileSwitch />
      {usedCats.length > 1 && (
        <div className="chips scroll">
          <button className={'chip' + (filter === 'todo' ? ' active' : '')} onClick={() => setFilter('todo')}>Todo</button>
          {usedCats.map((c) => <button key={c.id} className={'chip' + (filter === c.id ? ' active' : '')} onClick={() => setFilter(c.id)}>{c.label}</button>)}
        </div>
      )}
      {!mine.length && <Empty>📸 Toma fotos de tu ropa (camisas, shorts, zapatos…).<br />El fondo se quita solo para armar los outfits sobre la silueta.</Empty>}
      <div className="item-grid">
        {list.map((i) => (
          <button key={i.id} className="item-tile" onClick={() => setEdit(i)}>
            <div className="thumb checker">{i.image_key ? <img src={imgUrl(i.image_key)} alt="" loading="lazy" /> : <span>👕</span>}</div>
            <small>{i.name}</small>
          </button>
        ))}
      </div>
      <button className="fab" onClick={() => setEdit('new')} aria-label="Agregar prenda">＋</button>
      {edit && <ItemForm item={edit === 'new' ? undefined : edit} profileId={profile.id} gender={profile.gender} onClose={() => setEdit(null)} />}
    </div>
  );
}
