import { useState } from 'react';
import { getOutfit, save, useStore } from '../store';
import type { Activity, Day } from '../types';
import { Field, Header, Modal } from '../components/ui';
import { PortClock, Weather } from '../components/Weather';
import { MiniOutfit } from '../components/OutfitFigure';
import { ActivityForm, ProfileSwitch, ReminderForm } from '../components/Forms';
import { actType, DAY_TYPES, dayType, DRESS_CODES } from '../catalog';
import { fmtDate, fmtDateTime, money } from '../util';
import { go } from '../router';

function PortSearch({ day, onPick }: { day: Day; onPick: (p: Partial<Day>) => void }) {
  const [q, setQ] = useState(day.port || '');
  const [res, setRes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true);
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=es`);
      setRes((await r.json()).results || []);
    } catch { alert('Sin conexión para buscar'); }
    setBusy(false);
  }
  return (
    <div>
      <div className="row">
        <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cozumel, Roatán, Nassau…" onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn" onClick={search} disabled={busy || !q}>{busy ? '…' : '🔍'}</button>
      </div>
      {res.map((r) => (
        <button key={r.id} className="list-btn" onClick={() => { onPick({ port: r.name, country: r.country, lat: r.latitude, lon: r.longitude, tz: r.timezone }); setRes([]); setQ(r.name); }}>
          📍 {r.name}<small>{[r.admin1, r.country].filter(Boolean).join(', ')}</small>
        </button>
      ))}
      <button className="link small" onClick={() => onPick({ port: q })}>Usar “{q}” sin ubicación</button>
    </div>
  );
}

function DayEditor({ day, onClose }: { day: Day; onClose: () => void }) {
  const [d, setD] = useState<Day>(day);
  const f = (k: keyof Day) => (e: any) => setD({ ...d, [k]: e.target.value });
  return (
    <Modal title={`Editar día ${day.day_number}`} onClose={onClose}>
      <Field label="Tipo de día">
        <select value={d.type} onChange={f('type')}>{DAY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select>
      </Field>
      <Field label="Fecha"><input type="date" value={d.date || ''} onChange={f('date')} /></Field>
      {d.type !== 'navegacion' && (
        <Field label={`Puerto ${d.port ? '· ' + d.port + (d.country ? ', ' + d.country : '') : ''}`}>
          <PortSearch day={d} onPick={(p) => setD({ ...d, ...p })} />
        </Field>
      )}
      <div className="grid3">
        <Field label="Llegada"><input type="time" value={d.arrive || ''} onChange={f('arrive')} /></Field>
        <Field label="Salida"><input type="time" value={d.depart || ''} onChange={f('depart')} /></Field>
        <Field label="All aboard"><input type="time" value={d.all_aboard || ''} onChange={f('all_aboard')} /></Field>
      </div>
      <Field label="Código de vestimenta (noche)">
        <select value={d.dress_code || 'casual'} onChange={f('dress_code')}>{DRESS_CODES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      </Field>
      <Field label="Notas"><textarea rows={3} value={d.notes || ''} onChange={f('notes')} /></Field>
      <button className="btn primary block" onClick={() => { save('days', d); onClose(); }}>Guardar</button>
    </Modal>
  );
}

export function DayDetail({ id }: { id: string }) {
  const s = useStore();
  const day = s.days.find((d) => d.id === id);
  const [edit, setEdit] = useState(false);
  const [act, setAct] = useState<Activity | 'new' | null>(null);
  const [rem, setRem] = useState<any>(null);
  if (!day) return <div className="page"><Header title="Día" backBtn /><p>No encontrado</p></div>;
  const profile = s.profiles.find((p) => p.id === s.viewProfileId);
  const acts = s.activities.filter((a) => a.day_id === id).sort((a, b) => (a.start_time || '99').localeCompare(b.start_time || '99'));
  const rems = s.reminders.filter((r) => r.day_id === id);
  const prev = s.days.find((d) => d.day_number === day.day_number - 1);
  const next = s.days.find((d) => d.day_number === day.day_number + 1);
  const pname = (pid?: string | null) => (pid ? s.profiles.find((p) => p.id === pid)?.name : 'Ambos');

  return (
    <div className="page">
      <Header title={`Día ${day.day_number}`} sub={fmtDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })} backBtn
        right={<button className="icon-btn" onClick={() => setEdit(true)} aria-label="Editar">✏️</button>} />

      <section className="card day-hero">
        <span className="badge">{dayType(day.type).icon} {dayType(day.type).label}</span>
        <h2>{day.type === 'navegacion' ? 'Día en altamar' : day.port || 'Puerto por definir'}{day.country ? <small>, {day.country}</small> : null}</h2>
        <div className="times">
          {day.arrive && <span>🛬 Llegada {day.arrive}</span>}
          {day.depart && <span>🛫 Salida {day.depart}</span>}
          {day.all_aboard && <span className="warn-text">⚠️ All aboard {day.all_aboard}</span>}
        </div>
        {day.dress_code && day.dress_code !== 'casual' && <div className="dress">🎩 Noche: {DRESS_CODES.find((c) => c.id === day.dress_code)?.label}</div>}
        <Weather day={day} />
        <PortClock tz={day.tz} />
        {day.notes && <p className="notes">{day.notes}</p>}
        {!day.port && day.type !== 'navegacion' && <button className="btn ghost" onClick={() => setEdit(true)}>+ Agregar puerto y horarios</button>}
      </section>

      <section className="card">
        <div className="card-head"><h3>📅 Actividades</h3><button className="btn small" onClick={() => setAct('new')}>+ Agregar</button></div>
        {acts.map((a) => (
          <button key={a.id} className="act-card" onClick={() => setAct(a)}>
            <div className="act-time">{a.start_time || '--:--'}{a.end_time && <small>{a.end_time}</small>}</div>
            <div className="grow">
              <b>{actType(a.type).icon} {a.title}</b>
              <div className="pills">
                <span className={'pill ' + (a.included ? 'ok' : 'paid')}>{a.included ? 'Incluido' : money(a.price, a.currency) || 'Costo extra'}</span>
                {!a.included && <span className={'pill ' + (a.booked ? 'ok' : 'off')}>{a.booked ? 'Reservado' : 'Sin reservar'}</span>}
                <span className="pill">{pname(a.profile_id)}</span>
              </div>
              {a.location && <small className="muted">📍 {a.location}</small>}
              {a.meeting_point && <small className="muted">🤝 {a.meeting_point}</small>}
            </div>
          </button>
        ))}
        {!acts.length && <p className="muted small">Agrega tours, shows, cenas o lo que harán este día.</p>}
      </section>

      <section className="card">
        <div className="card-head"><h3>👕 Outfits</h3></div>
        <ProfileSwitch />
        {profile && (
          <div className="outfit-pair">
            {(['dia', 'noche'] as const).map((slot) => (
              <div key={slot} className="outfit-mini" onClick={() => go(`outfit/${day.id}/${slot}/${profile.id}`)}>
                <MiniOutfit gender={profile.gender} outfit={getOutfit(day.id, profile.id, slot)} items={s.items} />
                <small>{slot === 'dia' ? '☀️ Día' : '🌙 Noche'}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h3>⏰ Recordatorios</h3><button className="btn small" onClick={() => setRem('new')}>+ Agregar</button></div>
        {rems.map((r) => (
          <div key={r.id} className="rem-row">
            <input type="checkbox" checked={!!r.done} onChange={() => save('reminders', { ...r, done: r.done ? 0 : 1 })} />
            <span className={'grow' + (r.done ? ' done' : '')} onClick={() => setRem(r)}>{r.title}<small>{fmtDateTime(r.remind_at)} · {pname(r.profile_id)}</small></span>
          </div>
        ))}
        {!rems.length && <p className="muted small">Sin recordatorios para este día.</p>}
      </section>

      <div className="row between">
        {prev ? <button className="btn ghost" onClick={() => go(`dia/${prev.id}`)}>‹ Día {prev.day_number}</button> : <span />}
        {next ? <button className="btn ghost" onClick={() => go(`dia/${next.id}`)}>Día {next.day_number} ›</button> : <span />}
      </div>

      {edit && <DayEditor day={day} onClose={() => setEdit(false)} />}
      {act && <ActivityForm day={day} activity={act === 'new' ? undefined : act} onClose={() => setAct(null)} />}
      {rem && <ReminderForm dayId={day.id} reminder={rem === 'new' ? undefined : rem} onClose={() => setRem(null)} />}
    </div>
  );
}
