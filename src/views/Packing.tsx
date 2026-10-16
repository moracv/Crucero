import { useState } from 'react';
import { imgUrl, parseItems, remove, save, saveImage, uid, useStore } from '../store';
import type { Item } from '../types';
import { Chips, Empty, Field, Header, Modal } from '../components/ui';
import { ProfileSwitch } from '../components/Forms';
import { PhotoInput } from '../components/PhotoInput';
import { PACKING_CATS, PACKING_SUGGESTIONS } from '../catalog';

function PackItemForm({ item, category, onClose }: { item?: Item; category?: string; onClose: () => void }) {
  const s = useStore();
  const [it, setIt] = useState<Item>(item || { id: uid(), profile_id: null, kind: 'equipaje', category: category || 'documentos', name: '', qty: 1, packed: 0 });
  const [photo, setPhoto] = useState<Blob | null>(null);
  async function submit() {
    let image_key = it.image_key;
    if (photo) image_key = await saveImage(photo);
    save('items', { ...it, image_key });
    onClose();
  }
  return (
    <Modal title={item ? 'Editar artículo' : 'Nuevo artículo'} onClose={onClose}>
      <Field label="Artículo"><input value={it.name || ''} onChange={(e) => setIt({ ...it, name: e.target.value })} autoFocus /></Field>
      <div className="chips">
        {(PACKING_SUGGESTIONS[it.category] || []).map((sug) => <button key={sug} className="chip" onClick={() => setIt({ ...it, name: sug })}>{sug}</button>)}
      </div>
      <div className="grid2">
        <Field label="Categoría">
          <select value={it.category} onChange={(e) => setIt({ ...it, category: e.target.value })}>{PACKING_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </Field>
        <Field label="Cantidad"><input type="number" min={1} value={it.qty || 1} onChange={(e) => setIt({ ...it, qty: Number(e.target.value) })} /></Field>
      </div>
      <Field label="De quién">
        <select value={it.profile_id || ''} onChange={(e) => setIt({ ...it, profile_id: e.target.value || null })}>
          <option value="">Compartido</option>
          {s.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <PhotoInput onPhoto={setPhoto} removeBgDefault={false} preview={imgUrl(it.image_key)} />
      <div className="row">
        {item && <button className="btn danger" onClick={() => { remove('items', it.id); onClose(); }}>Eliminar</button>}
        <button className="btn primary grow" disabled={!it.name?.trim()} onClick={submit}>Guardar</button>
      </div>
    </Modal>
  );
}

function CheckRow({ item, onEdit }: { item: Item; onEdit: () => void }) {
  return (
    <div className={'pack-row' + (item.packed ? ' packed' : '')}>
      <input type="checkbox" checked={!!item.packed} onChange={() => save('items', { ...item, packed: item.packed ? 0 : 1 })} />
      {item.image_key ? <img className="pack-thumb checker" src={imgUrl(item.image_key)} alt="" loading="lazy" /> : null}
      <span className="grow" onClick={onEdit}>{item.name}{(item.qty || 1) > 1 && <b> ×{item.qty}</b>}</span>
    </div>
  );
}

export function Packing() {
  const s = useStore();
  const [tab, setTab] = useState<'ropa' | 'equipaje'>('ropa');
  const [edit, setEdit] = useState<Item | string | null>(null);
  const pid = s.viewProfileId;

  const usedIds = new Set<string>();
  s.outfits.filter((o) => o.profile_id === pid).forEach((o) => {
    const x = parseItems(o);
    Object.values(x).forEach((v) => (Array.isArray(v) ? v.forEach((a) => usedIds.add(a)) : v && usedIds.add(v as string)));
  });
  const clothes = s.items.filter((i) => usedIds.has(i.id));
  const bag = s.items.filter((i) => i.kind === 'equipaje' && (!i.profile_id || i.profile_id === pid));
  const list = tab === 'ropa' ? clothes : bag;
  const done = list.filter((i) => i.packed).length;

  return (
    <div className="page">
      <Header title="Maleta" sub="Checklist de equipaje" right={tab === 'equipaje' ? <button className="btn primary small" onClick={() => setEdit('documentos')}>+ Artículo</button> : undefined} />
      <ProfileSwitch />
      <Chips options={[{ id: 'ropa', label: '👕 Ropa de los outfits' }, { id: 'equipaje', label: '🧳 Equipaje' }]} value={tab} onChange={(v) => setTab(v as any)} />
      {list.length > 0 && (
        <div className="progress"><div style={{ width: `${(done / list.length) * 100}%` }} /><span>{done} / {list.length} empacado</span></div>
      )}
      {tab === 'ropa' && (
        <section className="card">
          {!clothes.length && <Empty>Cuando armes los outfits, aquí aparecerá la ropa que debes empacar.</Empty>}
          {clothes.map((i) => <CheckRow key={i.id} item={i} onEdit={() => {}} />)}
        </section>
      )}
      {tab === 'equipaje' && PACKING_CATS.map((c) => {
        const rows = bag.filter((i) => i.category === c.id);
        return (
          <section key={c.id} className="card">
            <div className="card-head"><h3>{c.label}</h3>
              <button className="link" onClick={() => setEdit(c.id)}>+ Agregar</button>
            </div>
            {rows.map((i) => <CheckRow key={i.id} item={i} onEdit={() => setEdit(i)} />)}
            {!rows.length && <p className="muted small">Sugerencias: {PACKING_SUGGESTIONS[c.id].slice(0, 3).join(', ')}</p>}
          </section>
        );
      })}
      {edit && <PackItemForm item={typeof edit === 'string' ? undefined : edit} category={typeof edit === 'string' ? edit : undefined} onClose={() => setEdit(null)} />}
    </div>
  );
}
