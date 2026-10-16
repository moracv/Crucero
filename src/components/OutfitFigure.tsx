import { useRef } from 'react';
import type { Item, OutfitItems, Slot } from '../types';
import { imgUrl } from '../store';
import { SLOT_LABEL } from '../catalog';

// ---------- Modelos (viewBox 200x420), piel trigueña clara ----------
const SKIN = '#d8a77f';
const SHADE = '#bf8c64';
const HAIR = '#2a1b12';
const LINE = '#a87652';

/** Refleja un path en el eje vertical central (x → 200 - x). */
const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${200 - Number(x)} ${y}`);
const pair = (d: string, fill: string) => (<><path d={d} fill={fill} /><path d={mirror(d)} fill={fill} /></>);

const FACE = (woman: boolean) => (
  <g>
    <path d={woman ? 'M90 26.5 Q93 25 96 26.5' : 'M88.5 28 L96 26.8'} stroke={HAIR} strokeWidth={woman ? 1.2 : 2} fill="none" strokeLinecap="round" />
    <path d={woman ? 'M104 26.5 Q107 25 110 26.5' : 'M104 26.8 L111.5 28'} stroke={HAIR} strokeWidth={woman ? 1.2 : 2} fill="none" strokeLinecap="round" />
    <ellipse cx="92.8" cy="32.5" rx="2.2" ry={woman ? 1.8 : 1.6} fill="#fff" />
    <ellipse cx="107.2" cy="32.5" rx="2.2" ry={woman ? 1.8 : 1.6} fill="#fff" />
    <circle cx="92.8" cy="32.6" r="1.3" fill="#3b2416" />
    <circle cx="107.2" cy="32.6" r="1.3" fill="#3b2416" />
    {woman && <path d="M90.2 31.4 L89 30.6 M95.4 31.4 L96.4 30.6 M104.6 31.4 L103.6 30.6 M109.8 31.4 L111 30.6" stroke={HAIR} strokeWidth="0.6" />}
    <path d="M100 34 L98.2 40.5 Q100 41.8 102 40.8" stroke={LINE} strokeWidth="1" fill="none" strokeLinecap="round" />
    {woman
      ? <path d="M95 45.4 Q97.5 44 100 44.8 Q102.5 44 105 45.4 Q100 49.2 95 45.4 Z" fill="#b5655a" />
      : <path d="M94.5 46.5 Q100 49.5 105.5 46.5" stroke="#9c5a4a" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
  </g>
);

const MAN = (
  <g>
    {/* piernas y pies */}
    {pair('M66 200 L100 200 L99 232 Q97 262 94 300 L92 380 L79 380 L75 300 Q68 262 66 232 Z', SKIN)}
    {pair('M78 378 L93 378 L95 392 Q96 398 88 398 L70 398 Q64 397 68 391 Z', SKIN)}
    <path d="M80 298 Q85 302 90 298 M110 298 Q115 302 120 298" stroke={LINE} strokeWidth="1" fill="none" opacity=".5" />
    {/* torso */}
    <path d="M66 78 Q100 70 134 78 Q142 82 144 96 L141 140 Q137 172 136 204 L64 204 Q63 172 59 140 L56 96 Q58 82 66 78 Z" fill={SKIN} />
    <path d="M78 118 Q90 126 99 120 M122 118 Q110 126 101 120 M100 132 L100 182 M96 176 Q100 180 104 176" stroke={LINE} strokeWidth="1" fill="none" opacity=".45" />
    {/* bóxer */}
    <path d="M63 196 L137 196 L138 236 L104 236 L100 222 L96 236 L62 236 Z" fill="#475569" />
    {/* brazos y manos */}
    {pair('M58 82 Q46 86 44 104 L40 146 L54 148 L60 108 Z', SKIN)}
    {pair('M40 144 L54 146 L50 200 L38 200 Z', SKIN)}
    <ellipse cx="44" cy="208" rx="7" ry="11" fill={SKIN} />
    <ellipse cx="156" cy="208" rx="7" ry="11" fill={SKIN} />
    {/* cuello y cabeza */}
    <path d="M90 50 L110 50 L111 72 Q100 78 89 72 Z" fill={SHADE} />
    <ellipse cx="82" cy="35" rx="3.5" ry="6.5" fill={SHADE} />
    <ellipse cx="118" cy="35" rx="3.5" ry="6.5" fill={SHADE} />
    <ellipse cx="100" cy="33" rx="18" ry="22" fill={SKIN} />
    <path d="M81 31 Q78 8 100 8.5 Q122 8 119 31 Q118 22 113 19 Q101 14 88 19 Q83 22 81 31 Z" fill={HAIR} />
    {FACE(false)}
  </g>
);

const WOMAN = (
  <g>
    {/* cabello largo (detrás) */}
    <path d="M80 30 Q77 5 100 6 Q123 5 120 30 L125 86 Q112 94 100 90 Q88 94 75 86 Z" fill={HAIR} />
    {pair('M68 204 L100 204 L99 236 Q97 266 95 302 L93 380 L81 380 L77 302 Q70 266 68 238 Z', SKIN)}
    {pair('M80 378 L93 378 L94 392 Q95 397 88 397 L74 397 Q69 396 72 391 Z', SKIN)}
    <path d="M82 300 Q86 304 91 300 M109 300 Q114 304 118 300" stroke={LINE} strokeWidth="1" fill="none" opacity=".5" />
    <path d="M74 78 Q100 71 126 78 Q132 82 132 94 L129 118 Q122 146 125 168 Q134 188 138 206 L62 206 Q66 188 75 168 Q78 146 71 118 L68 94 Q68 82 74 78 Z" fill={SKIN} />
    {/* ropa base neutra */}
    <path d="M72 97 Q86 92 100 99 Q114 92 128 97 L127 124 Q100 130 73 124 Z" fill="#64748b" />
    <path d="M64 196 L136 196 L137 232 L104 232 L100 218 L96 232 L63 232 Z" fill="#64748b" />
    {pair('M70 82 Q60 86 58 102 L54 146 L65 148 L70 108 Z', SKIN)}
    {pair('M54 144 L65 146 L61 198 L52 198 Z', SKIN)}
    <ellipse cx="56.5" cy="206" rx="6" ry="10" fill={SKIN} />
    <ellipse cx="143.5" cy="206" rx="6" ry="10" fill={SKIN} />
    <path d="M92 50 L108 50 L109 70 Q100 75 91 70 Z" fill={SHADE} />
    <ellipse cx="100" cy="32" rx="16.5" ry="20.5" fill={SKIN} />
    <path d="M83 31 Q81 9 100 9.5 Q119 9 117 31 Q113 20 104 17.5 Q93 24 83 31 Z" fill={HAIR} />
    {FACE(true)}
  </g>
);

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
}

export function OutfitFigure({ gender, outfit, items, height = 360, onTap, selected, liveFit, onDrag }: Props) {
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
    const z = ZONES[s];
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
      <svg viewBox="0 0 200 420" className="silhouette">{gender === 'M' ? WOMAN : MAN}</svg>
      {slots.map((s) => {
        const it = byId((outfit as any)[s]);
        const z = ZONES[s];
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
        if (!onTap || hidden(s) || s === 'outer' || s === 'eyes' || s === 'dress') return null; // el abrigo se agrega desde su botón
        return <button key={s} className="zone" style={{ ...style, zIndex: 10 }} onClick={() => onTap(s, false)}><span>+ {SLOT_LABEL[s]}</span></button>;
      })}
    </div>
  );
}

export function MiniOutfit({ gender, outfit, items }: { gender: 'H' | 'M'; outfit: OutfitItems; items: Item[] }) {
  return <OutfitFigure gender={gender} outfit={outfit} items={items} height={150} />;
}
