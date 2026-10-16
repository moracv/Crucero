import { useRef } from 'react';
import type { Profile } from '../types';
import { save } from '../store';
import { BEARDS, BodyConfig, defaultBody, FACES, HAIR_COLORS, HAIR_STYLES, SKINS } from './Body';

function Options({ label, options, value, onChange, swatch }: { label: string; options: { id: string; label: string; color?: string; base?: string }[]; value: string; onChange: (v: string) => void; swatch?: boolean }) {
  return (
    <div className="opt-group">
      <span>{label}</span>
      <div className="chips">
        {options.map((o) => (
          <button key={o.id} className={'chip' + (o.id === value ? ' active' : '')} onClick={() => onChange(o.id)}>
            {swatch && <i className="swatch" style={{ background: o.base || o.color }} />}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Editor del maniquí del perfil: cara y postura. Los cambios se ven en vivo y se guardan en el perfil. */
export function MannequinPanel({ profile, body, onChange, onClose }: { profile: Profile; body: BodyConfig; onChange: (b: BodyConfig) => void; onClose: () => void }) {
  const timer = useRef<any>(null);
  function set(patch: Partial<BodyConfig>) {
    const next = { ...body, ...patch };
    onChange(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save('profiles', { ...profile, body: JSON.stringify(next) }), 500);
  }
  const sliders: [keyof BodyConfig, string, number, number, number][] = [
    ['arms', 'Brazos (abrir)', -8, 40, 1],
    ['shoulders', 'Hombros', -6, 10, 0.5],
    ['legs', 'Piernas (abrir)', -4, 14, 0.5],
    ['legLen', 'Largo piernas', 0.85, 1.1, 0.01],
  ];
  return (
    <section className="card fit-panel">
      <div className="card-head"><h3>🧍 Maniquí de {profile.name}</h3><button className="link" onClick={onClose}>Listo</button></div>
      <h4>Cara</h4>
      <Options label="Tono de piel" options={SKINS} value={body.skin} onChange={(v) => set({ skin: v })} swatch />
      <Options label="Peinado" options={HAIR_STYLES[profile.gender]} value={body.hair} onChange={(v) => set({ hair: v })} />
      <Options label="Color de cabello" options={HAIR_COLORS} value={body.hairColor} onChange={(v) => set({ hairColor: v })} swatch />
      {profile.gender === 'H' && <Options label="Barba" options={BEARDS} value={body.beard} onChange={(v) => set({ beard: v })} />}
      <Options label="Forma del rostro" options={FACES} value={body.face} onChange={(v) => set({ face: v })} />
      <h4>Postura (para alinear con la ropa)</h4>
      {sliders.map(([k, label, min, max, step]) => (
        <label key={k} className="slider">
          <span>{label}</span>
          <input type="range" min={min} max={max} step={step} value={body[k] as number} onChange={(e) => set({ [k]: Number(e.target.value) } as any)} />
        </label>
      ))}
      <div className="row">
        <button className="btn ghost" onClick={() => set({ arms: 0, shoulders: 0, legs: 0, legLen: 1 })}>Restablecer postura</button>
        <button className="btn ghost" onClick={() => { const d = defaultBody(profile.gender); set({ skin: d.skin, hair: d.hair, hairColor: d.hairColor, beard: d.beard, face: d.face }); }}>Cara por defecto</button>
      </div>
    </section>
  );
}
