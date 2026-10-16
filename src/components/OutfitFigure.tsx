import type { Item, OutfitItems, Slot } from '../types';
import { imgUrl } from '../store';
import { SLOT_LABEL } from '../catalog';

// Siluetas simples dibujadas en SVG (viewBox 200x420)
const MAN = (
  <>
    <circle cx="100" cy="38" r="23" />
    <rect x="91" y="58" width="18" height="18" rx="5" />
    <path d="M62 78 Q100 68 138 78 L146 120 L140 212 L60 212 L54 120 Z" />
    <path d="M62 80 Q44 90 40 140 L33 215 L46 218 L56 150 L64 110 Z" />
    <path d="M138 80 Q156 90 160 140 L167 215 L154 218 L144 150 L136 110 Z" />
    <path d="M60 205 L140 205 L136 388 L108 388 L100 240 L92 388 L64 388 Z" />
    <ellipse cx="80" cy="397" rx="19" ry="8" />
    <ellipse cx="120" cy="397" rx="19" ry="8" />
  </>
);
const WOMAN = (
  <>
    <path d="M74 46 Q72 10 100 11 Q128 10 126 46 L130 78 L118 66 L118 40 Q100 30 82 40 L82 66 L70 78 Z" />
    <circle cx="100" cy="38" r="21" />
    <rect x="93" y="56" width="14" height="18" rx="5" />
    <path d="M70 80 Q100 71 130 80 L134 120 Q122 150 127 172 L142 214 L58 214 L73 172 Q78 150 66 120 Z" />
    <path d="M70 82 Q55 92 51 140 L45 210 L56 212 L62 150 L68 112 Z" />
    <path d="M130 82 Q145 92 149 140 L155 210 L144 212 L138 150 L132 112 Z" />
    <path d="M60 208 L140 208 L130 388 L107 388 L100 245 L93 388 L70 388 Z" />
    <ellipse cx="83" cy="397" rx="15" ry="7" />
    <ellipse cx="117" cy="397" rx="15" ry="7" />
  </>
);

// Zona de cada prenda sobre la silueta (en % del contenedor)
const ZONES: Record<Slot, { top: number; left: number; w: number; h: number; z: number }> = {
  bottom: { top: 47, left: 21, w: 58, h: 46, z: 1 },
  dress: { top: 16, left: 14, w: 72, h: 66, z: 2 },
  shoes: { top: 89, left: 20, w: 60, h: 11, z: 3 },
  top: { top: 16, left: 13, w: 74, h: 37, z: 4 },
  outer: { top: 15, left: 8, w: 84, h: 41, z: 5 },
  head: { top: 0, left: 28, w: 44, h: 16, z: 6 },
};

interface Props {
  gender: 'H' | 'M';
  outfit: OutfitItems;
  items: Item[];
  onZone?: (slot: Slot) => void;
  height?: number;
}

export function OutfitFigure({ gender, outfit, items, onZone, height = 360 }: Props) {
  const byId = (id?: string) => (id ? items.find((i) => i.id === id) : undefined);
  const slots: Slot[] = ['bottom', 'dress', 'shoes', 'top', 'outer', 'head'];
  const hidden = (s: Slot) => (outfit.dress && (s === 'top' || s === 'bottom')) || (!outfit.dress && (outfit.top || outfit.bottom) && s === 'dress');
  return (
    <div className="figure" style={{ height, width: (height * 200) / 420 }}>
      <svg viewBox="0 0 200 420" className="silhouette">{gender === 'M' ? WOMAN : MAN}</svg>
      {slots.map((s) => {
        const it = byId((outfit as any)[s]);
        const z = ZONES[s];
        const style = { top: z.top + '%', left: z.left + '%', width: z.w + '%', height: z.h + '%', zIndex: z.z };
        if (it?.image_key) return <img key={s} className="garment" style={style} src={imgUrl(it.image_key)} alt={it.name} onClick={() => onZone?.(s)} />;
        if (it) return <div key={s} className="garment garment-text" style={style} onClick={() => onZone?.(s)}>{it.name}</div>;
        if (!onZone || hidden(s)) return null;
        if (s === 'outer') return null; // el abrigo se agrega desde el botón
        return <button key={s} className="zone" style={{ ...style, zIndex: 10 }} onClick={() => onZone(s)}>+ {SLOT_LABEL[s]}</button>;
      })}
    </div>
  );
}

export function MiniOutfit({ gender, outfit, items }: { gender: 'H' | 'M'; outfit: OutfitItems; items: Item[] }) {
  return <OutfitFigure gender={gender} outfit={outfit} items={items} height={150} />;
}
