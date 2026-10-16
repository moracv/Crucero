import { useRef } from 'react';
import type { Item, OutfitItems, Slot } from '../types';
import { imgUrl } from '../store';
import { SLOT_LABEL } from '../catalog';
import { Body, BodyConfig, defaultBody } from './Body';

// ---------- Zonas de cada prenda (en % del contenedor) ----------
type Zone = { top: number; left: number; w: number; h: number; z: number; pos: string };
export const ZONES: Record<Slot, Zone> = {
  bottom: { top: 46.5, left: 29, w: 42, h: 45.5, z: 1, pos: '50% 0%' },
  dress: { top: 17, left: 22, w: 56, h: 60, z: 2, pos: '50% 0%' },
  shoes: { top: 89, left: 29, w: 42, h: 7.8, z: 3, pos: '50% 100%' },
  top: { top: 17, left: 18, w: 64, h: 35, z: 4, pos: '50% 0%' },
  outer: { top: 16.5, left: 15, w: 70, h: 40, z: 5, pos: '50% 0%' },
  head: { top: -2.5, left: 29, w: 42, h: 9, z: 7, pos: '50% 100%' },
  eyes: { top: 6.6, left: 39.5, w: 21, h: 3.4, z: 6, pos: '50% 50%' },
};

export interface Fit { x: number; y: number; s: number; sx: number; sy: number; r: number }
export const DEFAULT_FIT: Fit = { x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0 };
export function parseFit(it?: Item): Fit {
  if (!it?.fit) return DEFAULT_FIT;
  try { return { ...DEFAULT_FIT, ...JSON.parse(it.fit) }; } catch { return DEFAULT_FIT; }
}
const fitTransform = (f: Fit) => `translate(${f.x}%, ${f.y}%) rotate(${f.r}deg) scale(${f.s * f.sx}, ${f.s * f.sy})`;

interface Props {
  gender: 'H' | 'M';
  outfit: OutfitItems;
  items: Item[];
  height?: number;
  /** Modo edición: tocar una zona vacía o una prenda */
  onTap?: (slot: Slot, hasItem: boolean) => void;
  selected?: Slot | null;
  /** Ajuste en vivo de la prenda seleccionada (mientras se arrastra o se mueven los controles) */
  liveFit?: Fit | null;
  onDrag?: (fit: Fit, done: boolean) => void;
  body?: BodyConfig;
  /** Mostrar las guías punteadas de las zonas vacías */
  guides?: boolean;
}

export function OutfitFigure({ gender, outfit, items, height = 360, onTap, selected, liveFit, onDrag, body, guides = true }: Props) {
  const cfg = body || defaultBody(gender);
  // Los pies bajan o suben según el largo de piernas
  const zoneOf = (s: Slot) => (s === 'shoes' ? { ...ZONES.shoes, top: ZONES.shoes.top + ((cfg.legLen || 1) - 1) * (190 / 4.2) } : ZONES[s]);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; fit: Fit; last?: Fit } | null>(null);
  const byId = (id?: string) => (id ? items.find((i) => i.id === id) : undefined);
  const slots: Slot[] = ['bottom', 'dress', 'shoes', 'top', 'outer', 'eyes', 'head'];
  const hidden = (s: Slot) => (outfit.dress && (s === 'top' || s === 'bottom')) || (!outfit.dress && (outfit.top || outfit.bottom) && s === 'dress');

  function down(e: React.PointerEvent, s: Slot, fit: Fit) {
    if (s !== selected || !onDrag) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fit };
  }
  function move(e: React.PointerEvent, s: Slot) {
    if (!drag.current || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const z = zoneOf(s);
    const dx = ((e.clientX - drag.current.x) / (r.width * z.w / 100)) * 100;
    const dy = ((e.clientY - drag.current.y) / (r.height * z.h / 100)) * 100;
    drag.current.last = { ...drag.current.fit, x: Math.round(drag.current.fit.x + dx), y: Math.round(drag.current.fit.y + dy) };
    onDrag!(drag.current.last, false);
  }
  function up(e: React.PointerEvent, s: Slot) {
    if (!drag.current) return;
    const moved = Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y);
    move(e, s);
    const last = drag.current.last;
    drag.current = null;
    if (last) onDrag!(last, true);
    if (moved < 4) onTap?.(s, true);
  }

  return (
    <div ref={box} className="figure" style={{ height, width: (height * 200) / 420 }}>
      <svg viewBox="0 0 200 420" className="silhouette" overflow="visible"><Body gender={gender} config={cfg} /></svg>
      {slots.map((s) => {
        const it = byId((outfit as any)[s]);
        const z = zoneOf(s);
        const style: React.CSSProperties = { top: z.top + '%', left: z.left + '%', width: z.w + '%', height: z.h + '%', zIndex: z.z };
        if (it) {
          const fit = s === selected && liveFit ? liveFit : parseFit(it);
          const cls = 'garment' + (s === selected ? ' selected' : '');
          const common = {
            className: cls,
            style: { ...style, transform: fitTransform(fit), objectPosition: z.pos, zIndex: s === selected ? 9 : z.z, touchAction: s === selected ? 'none' : undefined },
            onPointerDown: (e: React.PointerEvent) => down(e, s, fit),
            onPointerMove: (e: React.PointerEvent) => move(e, s),
            onPointerUp: (e: React.PointerEvent) => up(e, s),
            onClick: () => { if (s !== selected) onTap?.(s, true); },
          };
          return it.image_key
            ? <img key={s} {...common} src={imgUrl(it.image_key)} alt={it.name} draggable={false} />
            : <div key={s} {...common} className={cls + ' garment-text'}>{it.name}</div>;
        }
        if (!onTap || !guides || hidden(s) || s === 'outer' || s === 'eyes' || s === 'dress' || s === 'head') return null; // el abrigo se agrega desde su botón
        return <button key={s} className="zone" style={{ ...style, zIndex: 10 }} onClick={() => onTap(s, false)}><span>+ {SLOT_LABEL[s]}</span></button>;
      })}
    </div>
  );
}

export function MiniOutfit({ gender, outfit, items, body }: { gender: 'H' | 'M'; outfit: OutfitItems; items: Item[]; body?: BodyConfig }) {
  return <OutfitFigure gender={gender} outfit={outfit} items={items} height={150} body={body} />;
}
