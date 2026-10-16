import { useState } from 'react';
import { getOutfit, outfitId, save, useStore, imgUrl } from '../store';
import type { Item, OutfitItems, Slot } from '../types';
import { Header, Modal } from '../components/ui';
import { OutfitFigure } from '../components/OutfitFigure';
import { useWeather, weatherText } from '../components/Weather';
import { catById, catsForSlot, DRESS_CODES, SLOT_LABEL } from '../catalog';
import { fmtDate } from '../util';
import { go } from '../router';

function Picker({ slot, items, selected, multi, onPick, onClose }: { slot: string; items: Item[]; selected: string[]; multi?: boolean; onPick: (ids: string[]) => void; onClose: () => void }) {
  const list = items.filter((i) => catsForSlot(slot).includes(i.category));
  const [sel, setSel] = useState<string[]>(selected);
  const toggle = (id: string) => {
    if (!multi) { onPick(sel.includes(id) ? [] : [id]); onClose(); return; }
    setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  };
  return (
    <Modal title={`Elegir: ${SLOT_LABEL[slot as Slot | 'accessory']}`} onClose={onClose}>
      {!list.length && <p className="muted">No tienes prendas de este tipo. <button className="link" onClick={() => go('ropa')}>Agregar al catálogo</button></p>}
      <div className="item-grid">
        {list.map((i) => (
          <button key={i.id} className={'item-tile' + (sel.includes(i.id) ? ' selected' : '')} onClick={() => toggle(i.id)}>
            <div className="thumb checker">{i.image_key ? <img src={imgUrl(i.image_key)} alt="" /> : <span>👕</span>}</div>
            <small>{i.name || catById(i.category)?.label}</small>
          </button>
        ))}
      </div>
      <div className="row">
        {!multi && selected.length > 0 && <button className="btn danger" onClick={() => { onPick([]); onClose(); }}>Quitar prenda</button>}
        {multi && <button className="btn primary grow" onClick={() => { onPick(sel); onClose(); }}>Listo</button>}
      </div>
    </Modal>
  );
}

export function OutfitBuilder({ dayId, slot, profileId }: { dayId: string; slot: 'dia' | 'noche'; profileId: string }) {
  const s = useStore();
  const day = s.days.find((d) => d.id === dayId);
  const profile = s.profiles.find((p) => p.id === profileId);
  const items = s.items.filter((i) => i.kind === 'ropa' && i.profile_id === profileId);
  const outfit = getOutfit(dayId, profileId, slot);
  const existing = s.outfits.find((o) => o.id === outfitId(dayId, profileId, slot));
  const [picker, setPicker] = useState<string | null>(null);
  const [ai, setAi] = useState<{ busy?: boolean; msg?: string; error?: string }>({});
  const [request, setRequest] = useState('');
  const { w } = useWeather(day);
  if (!day || !profile) return <div className="page"><Header title="Outfit" backBtn /></div>;

  function update(next: OutfitItems, notes = existing?.notes) {
    save('outfits', { id: outfitId(dayId, profileId, slot), day_id: dayId, profile_id: profileId, slot, items: JSON.stringify(next), notes });
  }
  function pick(sl: string, ids: string[]) {
    const next: OutfitItems = { ...outfit };
    if (sl === 'accessory') next.accessories = ids;
    else {
      (next as any)[sl] = ids[0];
      if (sl === 'dress' && ids[0]) { delete next.top; delete next.bottom; }
      if ((sl === 'top' || sl === 'bottom') && ids[0]) delete next.dress;
    }
    update(next);
  }
  function copyFrom(otherSlot: 'dia' | 'noche') {
    update(getOutfit(dayId, profileId, otherSlot));
  }

  async function suggest() {
    setAi({ busy: true });
    try {
      const r = await fetch('/api/ai/suggest', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dayId, profileId, slot, weather: weatherText(w), request }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      update(d.items);
      setAi({ msg: d.explicacion + (d.faltantes ? `\n💡 ${d.faltantes}` : '') });
    } catch (e: any) {
      setAi({ error: navigator.onLine ? e.message : 'La IA necesita conexión a internet' });
    }
  }

  const accessories = (outfit.accessories || []).map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[];
  const dress = DRESS_CODES.find((c) => c.id === day.dress_code);

  return (
    <div className="page">
      <Header title={`${slot === 'dia' ? '☀️ Día' : '🌙 Noche'} · ${profile.name}`}
        sub={`Día ${day.day_number} · ${day.type === 'navegacion' ? 'Altamar' : day.port || ''} · ${fmtDate(day.date)}`} backBtn />
      <div className="seg">
        {(['dia', 'noche'] as const).map((sl) => (
          <button key={sl} className={sl === slot ? 'active' : ''} onClick={() => go(`outfit/${dayId}/${sl}/${profileId}`)}>{sl === 'dia' ? '☀️ Día' : '🌙 Noche'}</button>
        ))}
      </div>
      {slot === 'noche' && dress && <div className="dress center">🎩 Código: {dress.label}</div>}
      {w && <div className="center muted small">{w.icon} {weatherText(w)}</div>}

      <div className="builder">
        <OutfitFigure gender={profile.gender} outfit={outfit} items={items} onZone={(z) => setPicker(z)} height={Math.min(440, window.innerHeight * 0.55)} />
      </div>

      <div className="acc-row">
        {accessories.map((a) => <div key={a.id} className="acc checker">{a.image_key ? <img src={imgUrl(a.image_key)} alt="" /> : a.name}</div>)}
        <button className="btn small" onClick={() => setPicker('accessory')}>+ Accesorios</button>
        <button className="btn small" onClick={() => setPicker('outer')}>{outfit.outer ? '🧥 Cambiar abrigo' : '+ Abrigo'}</button>
        {profile.gender === 'M' && <button className="btn small" onClick={() => setPicker('dress')}>{outfit.dress ? '👗 Cambiar vestido' : '+ Vestido'}</button>}
      </div>

      <section className="card">
        <h3>✨ Sugerencia con IA</h3>
        {s.settings?.has_key ? (
          <>
            <input value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Opcional: ‘algo fresco para el snorkel’" />
            <button className="btn primary block" onClick={suggest} disabled={ai.busy}>{ai.busy ? 'Pensando…' : 'Sugerir outfit'}</button>
          </>
        ) : <p className="muted small">Configura Claude, GPT o Gemini en <button className="link" onClick={() => go('ajustes')}>Ajustes</button>.</p>}
        {ai.msg && <p className="ai-msg">{ai.msg}</p>}
        {ai.error && <p className="error">{ai.error}</p>}
      </section>

      <section className="card">
        <h3>📝 Notas</h3>
        <textarea rows={2} defaultValue={existing?.notes || ''} onBlur={(e) => e.target.value !== (existing?.notes || '') && update(outfit, e.target.value)} placeholder="Llevar bolso de playa…" />
        <div className="row">
          <button className="btn ghost" onClick={() => copyFrom(slot === 'dia' ? 'noche' : 'dia')}>Copiar de {slot === 'dia' ? 'noche' : 'día'}</button>
          <button className="btn ghost danger-text" onClick={() => confirm('¿Vaciar este outfit?') && update({})}>Vaciar</button>
        </div>
      </section>

      {picker && (
        <Picker slot={picker} items={items} multi={picker === 'accessory'}
          selected={picker === 'accessory' ? outfit.accessories || [] : [(outfit as any)[picker]].filter(Boolean)}
          onPick={(ids) => pick(picker, ids)} onClose={() => setPicker(null)} />
      )}
    </div>
  );
}
