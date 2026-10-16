import { useState } from 'react';
import { remove, save, uid, useStore, setMyProfile } from '../store';
import type { Day, Profile, Trip } from '../types';
import { Field, Header } from '../components/ui';
import { addDays } from '../util';
import { go } from '../router';

const COLORS = ['#0e7490', '#db2777', '#7c3aed', '#ea580c'];

export function Setup() {
  const s = useStore();
  const [trip, setTrip] = useState<Trip>(s.trip || { id: 'trip', name: 'Crucero por el Caribe', cruise_line: 'NCL', nights: 7 });
  const [profiles, setProfiles] = useState<Profile[]>(
    s.profiles.length ? s.profiles : [
      { id: uid(), name: '', gender: 'H', color: COLORS[0] },
      { id: uid(), name: '', gender: 'M', color: COLORS[1] },
    ],
  );
  const [me, setMe] = useState<string>(s.me?.profile_id || '');
  const t = (k: keyof Trip) => (e: any) => setTrip({ ...trip, [k]: e.target.value });

  function submit() {
    const nights = Math.max(1, Math.min(30, Number(trip.nights) || 7));
    save('trip', { ...trip, nights });
    profiles.filter((p) => p.name.trim()).forEach((p) => save('profiles', p));
    s.profiles.filter((p) => !profiles.some((x) => x.id === p.id)).forEach((p) => remove('profiles', p.id));

    // Genera / ajusta los días (7 noches = 8 días)
    const total = nights + 1;
    for (let n = 1; n <= total; n++) {
      const existing = s.days.find((d) => d.day_number === n);
      const date = trip.start_date ? addDays(trip.start_date, n - 1) : undefined;
      const type = n === 1 ? 'embarque' : n === total ? 'desembarque' : existing?.type === 'embarque' || existing?.type === 'desembarque' ? 'puerto' : existing?.type || 'puerto';
      const day: Day = existing ? { ...existing, date, type } : { id: uid(), day_number: n, date, type, port: n === 1 || n === total ? trip.embark_port : '', dress_code: 'casual' };
      if (n === 1 || n === total) day.port = day.port || trip.embark_port;
      save('days', day);
    }
    s.days.filter((d) => d.day_number > total).forEach((d) => remove('days', d.id));
    const mine = me || profiles.find((p) => p.name.trim())?.id;
    if (mine && mine !== s.me?.profile_id) setMyProfile(mine);
    go('itinerario');
  }

  return (
    <div className="page">
      <Header title="Configurar crucero" backBtn={!!s.trip} />
      <section className="card">
        <h3>🛳️ El crucero</h3>
        <Field label="Nombre del viaje"><input value={trip.name || ''} onChange={t('name')} /></Field>
        <div className="grid2">
          <Field label="Naviera"><input value={trip.cruise_line || ''} onChange={t('cruise_line')} /></Field>
          <Field label="Barco"><input value={trip.ship || ''} onChange={t('ship')} placeholder="Norwegian ..." /></Field>
        </div>
        <div className="grid2">
          <Field label="Fecha de embarque"><input type="date" value={trip.start_date || ''} onChange={t('start_date')} /></Field>
          <Field label="Noches"><input type="number" min={1} max={30} value={trip.nights ?? 7} onChange={t('nights')} /></Field>
        </div>
        <Field label="Puerto de embarque"><input value={trip.embark_port || ''} onChange={t('embark_port')} placeholder="Miami, Port Canaveral…" /></Field>
        <div className="grid2">
          <Field label="Cabina"><input value={trip.cabin || ''} onChange={t('cabin')} /></Field>
          <Field label="N.º de reserva"><input value={trip.booking || ''} onChange={t('booking')} /></Field>
        </div>
        <Field label="Notas"><textarea value={trip.notes || ''} onChange={t('notes')} rows={2} /></Field>
      </section>

      <section className="card">
        <h3>👫 Perfiles</h3>
        {profiles.map((p, i) => (
          <div key={p.id} className="profile-row">
            <input placeholder="Nombre" value={p.name} onChange={(e) => setProfiles(profiles.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
            <select value={p.gender} onChange={(e) => setProfiles(profiles.map((x) => (x.id === p.id ? { ...x, gender: e.target.value as any } : x)))}>
              <option value="H">Hombre</option>
              <option value="M">Mujer</option>
            </select>
            <label className="me-radio"><input type="radio" name="me" checked={me === p.id} onChange={() => setMe(p.id)} /> Soy yo</label>
            {profiles.length > 1 && <button className="icon-btn" onClick={() => setProfiles(profiles.filter((x) => x.id !== p.id))}>🗑️</button>}
            {i === 0 && null}
          </div>
        ))}
        <button className="btn ghost" onClick={() => setProfiles([...profiles, { id: uid(), name: '', gender: 'H', color: COLORS[profiles.length % COLORS.length] }])}>+ Agregar perfil</button>
      </section>

      <button className="btn primary block" onClick={submit} disabled={!profiles.some((p) => p.name.trim())}>Guardar y generar días</button>
      <p className="muted small center">Luego podrás poner el puerto, horarios y actividades de cada día.</p>
    </div>
  );
}
