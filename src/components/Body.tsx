// Maniquí configurable (viewBox 200x420): tono de piel, peinado, barba, forma de rostro y postura.

export interface BodyConfig {
  skin: string;
  hair: string;      // estilo de peinado
  hairColor: string;
  beard: string;     // solo hombre
  face: string;      // ovalado | redondo | anguloso
  arms: number;      // apertura de brazos en grados
  shoulders: number; // ancho de hombros (desplazamiento)
  legs: number;      // apertura de piernas en grados
  legLen: number;    // largo de piernas (escala)
}

export const SKINS = [
  { id: 'trigueno-claro', label: 'Trigueño claro', base: '#d8a77f', shade: '#bf8c64' },
  { id: 'trigueno', label: 'Trigueño', base: '#c8956b', shade: '#ad7b53' },
  { id: 'canela', label: 'Canela', base: '#b07d55', shade: '#94643f' },
  { id: 'moreno', label: 'Moreno', base: '#8d5e3c', shade: '#744b2e' },
];
export const HAIR_COLORS = [
  { id: 'negro', label: 'Negro', color: '#1c130d' },
  { id: 'castano-oscuro', label: 'Castaño oscuro', color: '#3b2416' },
  { id: 'castano', label: 'Castaño', color: '#5a3a22' },
  { id: 'canoso', label: 'Canoso', color: '#8a8580' },
];
export const HAIR_STYLES: Record<'H' | 'M', { id: string; label: string }[]> = {
  H: [
    { id: 'corto', label: 'Corto' },
    { id: 'costado', label: 'Peinado al costado' },
    { id: 'ondulado', label: 'Ondulado' },
    { id: 'rapado', label: 'Rapado' },
  ],
  M: [
    { id: 'largo', label: 'Largo lacio' },
    { id: 'ondulado', label: 'Largo ondulado' },
    { id: 'cola', label: 'Cola de caballo' },
    { id: 'recogido', label: 'Recogido (moño)' },
    { id: 'corto', label: 'Melena corta' },
  ],
};
export const BEARDS = [
  { id: 'ninguna', label: 'Sin barba' },
  { id: 'bigote', label: 'Bigote' },
  { id: 'candado', label: 'Candado' },
  { id: 'barba', label: 'Barba corta' },
];
export const FACES = [
  { id: 'ovalado', label: 'Ovalado' },
  { id: 'redondo', label: 'Redondo' },
  { id: 'anguloso', label: 'Anguloso' },
];

export const defaultBody = (g: 'H' | 'M'): BodyConfig => ({
  skin: 'trigueno-claro', hair: g === 'M' ? 'largo' : 'corto', hairColor: 'negro', beard: 'ninguna', face: 'ovalado',
  arms: 0, shoulders: 0, legs: 0, legLen: 1,
});
export function parseBody(g: 'H' | 'M', raw?: string | null): BodyConfig {
  if (!raw) return defaultBody(g);
  try { return { ...defaultBody(g), ...JSON.parse(raw) }; } catch { return defaultBody(g); }
}

const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${200 - Number(x)} ${y}`);

function Head({ woman, c, skin, shade, hair }: { woman: boolean; c: BodyConfig; skin: string; shade: string; hair: string }) {
  const LINE = shade;
  const cy = woman ? 32 : 33;
  const rx = (woman ? 16.5 : 18) + (c.face === 'redondo' ? 1.5 : 0);
  const ry = (woman ? 20.5 : 22) - (c.face === 'redondo' ? 1 : 0);
  const head = c.face === 'anguloso'
    ? <path d={`M${100 - rx} ${cy - 6} Q${100 - rx} ${cy - ry} 100 ${cy - ry} Q${100 + rx} ${cy - ry} ${100 + rx} ${cy - 6} L${100 + rx - 1} ${cy + 8} Q${100 + rx - 4} ${cy + ry - 2} 100 ${cy + ry} Q${100 - rx + 4} ${cy + ry - 2} ${100 - rx + 1} ${cy + 8} Z`} fill={skin} />
    : <ellipse cx="100" cy={cy} rx={rx} ry={ry} fill={skin} />;
  // Cabello trasero (va detrás de la cabeza y el cuello)
  const back: Record<string, string> = {
    largo: 'M80 30 Q77 5 100 6 Q123 5 120 30 L125 86 Q112 94 100 90 Q88 94 75 86 Z',
    ondulado: 'M78 30 Q74 4 100 5 Q126 4 122 30 Q130 50 124 70 Q130 82 120 92 Q110 96 100 92 Q90 96 80 92 Q70 82 76 70 Q70 50 78 30 Z',
    corto: 'M79 30 Q76 5 100 6 Q124 5 121 30 L123 58 Q112 63 100 60 Q88 63 77 58 Z',
  };
  const front: Record<string, string> = woman ? {
    largo: 'M83 31 Q81 9 100 9.5 Q119 9 117 31 Q113 20 104 17.5 Q93 24 83 31 Z',
    ondulado: 'M82 32 Q80 8 100 8.5 Q120 8 118 32 Q114 19 106 17 Q96 25 82 32 Z',
    cola: 'M83 31 Q81 9 100 9.5 Q119 9 117 31 Q114 18 100 16 Q86 18 83 31 Z',
    recogido: 'M83 31 Q81 9 100 9.5 Q119 9 117 31 Q114 18 100 16 Q86 18 83 31 Z',
    corto: 'M82 33 Q80 8 100 8.5 Q120 8 118 33 Q112 18 100 18 Q90 18 82 33 Z',
  } : {
    corto: 'M81 31 Q78 8 100 8.5 Q122 8 119 31 Q118 22 113 19 Q101 14 88 19 Q83 22 81 31 Z',
    costado: 'M81 32 Q78 7 102 7.5 Q122 8 119 30 Q116 18 104 16 Q92 22 81 32 Z',
    ondulado: 'M80 32 Q76 14 86 10 Q92 4 100 7 Q108 3 115 9 Q124 14 120 32 Q118 22 112 19 Q106 22 100 18 Q93 22 87 19 Q82 22 80 32 Z',
    rapado: 'M82.5 27 Q81.5 11 100 10.5 Q118.5 11 117.5 27 Q114 17.5 100 16.5 Q86 17.5 82.5 27 Z',
  };
  return (
    <g>
      {woman && back[c.hair] && <path d={back[c.hair]} fill={hair} />}
      {woman && c.hair === 'cola' && <path d="M112 14 Q132 18 128 58 Q126 72 118 78 Q124 50 110 20 Z" fill={hair} />}
      {woman && c.hair === 'recogido' && <circle cx="100" cy="7" r="8.5" fill={hair} />}
      <path d={woman ? 'M92 50 L108 50 L109 70 Q100 75 91 70 Z' : 'M90 50 L110 50 L111 72 Q100 78 89 72 Z'} fill={shade} />
      {(!woman || c.hair === 'cola' || c.hair === 'recogido') && <>
        <ellipse cx={100 - rx} cy={cy + 2} rx="3.5" ry="6.5" fill={shade} />
        <ellipse cx={100 + rx} cy={cy + 2} rx="3.5" ry="6.5" fill={shade} />
      </>}
      {head}
      {!woman && c.beard === 'barba' && <path d={`M${100 - rx + 1} ${cy + 4} Q${100 - rx + 2} ${cy + ry} 100 ${cy + ry + 1} Q${100 + rx - 2} ${cy + ry} ${100 + rx - 1} ${cy + 4} Q${100 + rx - 3} ${cy + 13} 108 ${cy + 14} Q100 ${cy + 11} 92 ${cy + 14} Q${100 - rx + 3} ${cy + 13} ${100 - rx + 1} ${cy + 4} Z`} fill={hair} opacity=".85" />}
      <path d={front[c.hair] || Object.values(front)[0]} fill={hair} opacity={c.hair === 'rapado' ? 0.8 : 1} />
      {/* rostro: cejas pobladas, ojos almendrados café oscuro */}
      <path d={woman ? 'M89.5 26.8 Q93 25 96.5 26.6' : 'M88 28 Q92 26 96.5 26.8'} stroke={hair} strokeWidth={woman ? 1.4 : 2.2} fill="none" strokeLinecap="round" />
      <path d={woman ? 'M103.5 26.6 Q107 25 110.5 26.8' : 'M103.5 26.8 Q108 26 112 28'} stroke={hair} strokeWidth={woman ? 1.4 : 2.2} fill="none" strokeLinecap="round" />
      <path d="M90 32.6 Q92.8 30.6 95.8 32.4 Q92.8 34.2 90 32.6 Z M104.2 32.4 Q107.2 30.6 110 32.6 Q107.2 34.2 104.2 32.4 Z" fill="#fff" />
      <circle cx="92.9" cy="32.5" r="1.35" fill="#2b1a10" />
      <circle cx="107.1" cy="32.5" r="1.35" fill="#2b1a10" />
      {woman && <path d="M89.6 32.4 L88.6 31.4 M110.4 32.4 L111.4 31.4" stroke={hair} strokeWidth="0.7" strokeLinecap="round" />}
      <path d="M100 34 Q98.4 39 97.6 40.4 Q100 42 102.4 40.6" stroke={LINE} strokeWidth="1.05" fill="none" strokeLinecap="round" />
      {woman
        ? <path d="M95 45.6 Q97.5 44.2 100 45 Q102.5 44.2 105 45.6 Q100 49.4 95 45.6 Z" fill="#a85a4c" />
        : <path d="M94.5 46.6 Q100 49.4 105.5 46.6" stroke="#874c3c" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      {!woman && (c.beard === 'bigote' || c.beard === 'candado') && <path d="M93 44.6 Q100 41.4 107 44.6 Q100 46 93 44.6 Z" fill={hair} />}
      {!woman && c.beard === 'candado' && <path d="M95.5 49.5 Q100 55.5 104.5 49.5 Q100 51.2 95.5 49.5 Z" fill={hair} />}
    </g>
  );
}

export function Body({ gender, config }: { gender: 'H' | 'M'; config: BodyConfig }) {
  const woman = gender === 'M';
  const c = config;
  const tone = SKINS.find((s) => s.id === c.skin) || SKINS[0];
  const skin = tone.base, shade = tone.shade;
  const hair = (HAIR_COLORS.find((h) => h.id === c.hairColor) || HAIR_COLORS[0]).color;
  const k = c.legLen || 1;

  const leg = woman ? 'M68 204 L100 204 L99 236 Q97 266 95 302 L93 380 L81 380 L77 302 Q70 266 68 238 Z' : 'M66 200 L100 200 L99 232 Q97 262 94 300 L92 380 L79 380 L75 300 Q68 262 66 232 Z';
  const foot = woman ? 'M80 378 L93 378 L94 392 Q95 397 88 397 L74 397 Q69 396 72 391 Z' : 'M78 378 L93 378 L95 392 Q96 398 88 398 L70 398 Q64 397 68 391 Z';
  const knee = woman ? 'M82 300 Q86 304 91 300' : 'M80 298 Q85 302 90 298';
  const upper = woman ? 'M70 82 Q60 86 58 102 L54 146 L65 148 L70 108 Z' : 'M58 82 Q46 86 44 104 L40 146 L54 148 L60 108 Z';
  const fore = woman ? 'M54 144 L65 146 L61 198 L52 198 Z' : 'M40 144 L54 146 L50 200 L38 200 Z';
  const hand = woman ? { cx: 56.5, cy: 206, rx: 6, ry: 10 } : { cx: 44, cy: 208, rx: 7, ry: 11 };
  const shoulder = woman ? { x: 68, y: 84 } : { x: 58, y: 86 };
  const hip = { x: woman ? 84 : 83, y: woman ? 204 : 200 };

  const Leg = ({ side }: { side: 1 | -1 }) => {
    const m = (d: string) => (side === 1 ? d : mirror(d));
    const hx = side === 1 ? hip.x : 200 - hip.x;
    return (
      <g transform={`rotate(${side * c.legs} ${hx} ${hip.y}) translate(0 ${hip.y}) scale(1 ${k}) translate(0 ${-hip.y})`}>
        <path d={m(leg)} fill={skin} />
        <path d={m(knee)} stroke={shade} strokeWidth="1" fill="none" opacity=".6" />
        <g transform={`translate(0 ${hip.y + (390 - hip.y)}) scale(1 ${1 / k}) translate(0 ${-(hip.y + (390 - hip.y))})`}>
          <path d={m(foot)} fill={skin} />
        </g>
      </g>
    );
  };
  const Arm = ({ side }: { side: 1 | -1 }) => {
    const m = (d: string) => (side === 1 ? d : mirror(d));
    const sx = side === 1 ? shoulder.x : 200 - shoulder.x;
    return (
      <g transform={`translate(${-side * c.shoulders} 0) rotate(${side * c.arms} ${sx} ${shoulder.y})`}>
        <path d={m(upper)} fill={skin} />
        <path d={m(fore)} fill={skin} />
        <ellipse cx={side === 1 ? hand.cx : 200 - hand.cx} cy={hand.cy} rx={hand.rx} ry={hand.ry} fill={skin} />
      </g>
    );
  };
  const sh = c.shoulders;
  const torso = woman
    ? `M${74 - sh} 78 Q100 71 ${126 + sh} 78 Q${132 + sh} 82 ${132 + sh} 94 L129 118 Q122 146 125 168 Q134 188 138 206 L62 206 Q66 188 75 168 Q78 146 71 118 L${68 - sh} 94 Q${68 - sh} 82 ${74 - sh} 78 Z`
    : `M${66 - sh} 78 Q100 70 ${134 + sh} 78 Q${142 + sh} 82 ${144 + sh} 96 L141 140 Q137 172 136 204 L64 204 Q63 172 59 140 L${56 - sh} 96 Q${58 - sh} 82 ${66 - sh} 78 Z`;

  return (
    <g>
      <Leg side={1} />
      <Leg side={-1} />
      <path d={torso} fill={skin} />
      {!woman && <path d="M78 118 Q90 126 99 120 M122 118 Q110 126 101 120 M100 132 L100 182 M96 176 Q100 180 104 176" stroke={shade} strokeWidth="1" fill="none" opacity=".55" />}
      {woman
        ? <><path d="M72 97 Q86 92 100 99 Q114 92 128 97 L127 124 Q100 130 73 124 Z" fill="#64748b" /><path d="M64 196 L136 196 L137 232 L104 232 L100 218 L96 232 L63 232 Z" fill="#64748b" /></>
        : <path d="M63 196 L137 196 L138 236 L104 236 L100 222 L96 236 L62 236 Z" fill="#475569" />}
      <Arm side={1} />
      <Arm side={-1} />
      <Head woman={woman} c={c} skin={skin} shade={shade} hair={hair} />
    </g>
  );
}
