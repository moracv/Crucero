import { useState } from 'react';
import { remove, save, setViewProfile, uid, useStore } from '../store';
import type { Activity, Day, Reminder } from '../types';
import { ACTIVITY_TYPES } from '../catalog';
import { Field, Modal, Toggle } from './ui';
import { isoToLocalInput, localToISO } from '../util';

export function ProfileSwitch() {
  const s = useStore();
  if (s.profiles.length < 2) return null;
  return (
    <div className="seg">
      {s.profiles.map((p) => (
        <button key={p.id} className={p.id === s.viewProfileId ? 'active' : ''} onClick={() => setViewProfile(p.id)}>
          {p.gender === 'M' ? '👩' : '👨'} {p.name}
        </button>
      ))}
    </div>
  );
}

function ProfileSelect({ value, onChange, allLabel = 'Ambos' }: { value?: string | null; onChange: (v: string | null) => void; allLabel?: string }) {
  const s = useStore();
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{allLabel}</option>
      {s.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

export function ActivityForm({ day, activity, onClose }: { day: Day; activity?: Activity; onClose: () => void }) {
  const [a, setA] = useState<Activity>(activity || { id: uid(), day_id: day.id, title: '', type: day.type === 'puerto' ? 'tour' : 'abordo', included: 0, booked: 0, currency: 'USD', profile_id: null });
  const f = (k: keyof Activity) => (e: any) => setA({ ...a, [k]: e.target.value });
  const s = useStore();

  function addReminder() {
    if (!day.date || !a.start_time) return alert('Pon la fecha del día y la hora de la actividad primero');
    const at = new Date(`${day.date}T${a.start_time}`);
    at.setMinutes(at.getMinutes() - 60);
    save<Reminder>('reminders', { id: uid(), day_id: day.id, profile_id: a.profile_id, remind_at: at.toISOString(), title: `${a.title} en 1 hora`, notes: a.meeting_point ? 'Punto de encuentro: ' + a.meeting_point : '', done: 0, sent: 0 });
    alert('Recordatorio creado 1 hora antes');
  }

  return (
    <Modal title={activity ? 'Editar actividad' : 'Nueva actividad'} onClose={onClose}>
      <Field label="Título"><input value={a.title} onChange={f('title')} placeholder="Snorkel en arrecife, Show de Broadway…" autoFocus /></Field>
      <Field label="Tipo">
        <select value={a.type} onChange={f('type')}>{ACTIVITY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select>
      </Field>
      <div className="grid2">
        <Field label="Inicio"><input type="time" value={a.start_time || ''} onChange={f('start_time')} /></Field>
        <Field label="Fin"><input type="time" value={a.end_time || ''} onChange={f('end_time')} /></Field>
      </div>
      <Field label="Lugar"><input value={a.location || ''} onChange={f('location')} placeholder="Teatro, cubierta 7, puerto…" /></Field>
      <Field label="Punto de encuentro"><input value={a.meeting_point || ''} onChange={f('meeting_point')} /></Field>
      <Toggle checked={!!a.included} onChange={(v) => setA({ ...a, included: v ? 1 : 0 })} label="Incluido en el crucero" />
      {!a.included && (
        <div className="grid2">
          <Field label="Precio"><input type="number" inputMode="decimal" value={a.price ?? ''} onChange={(e) => setA({ ...a, price: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
          <Field label="Moneda"><input value={a.currency || 'USD'} onChange={f('currency')} /></Field>
        </div>
      )}
      <Toggle checked={!!a.booked} onChange={(v) => setA({ ...a, booked: v ? 1 : 0 })} label="Ya está reservado" />
      <Field label="Para"><ProfileSelect value={a.profile_id} onChange={(v) => setA({ ...a, profile_id: v })} /></Field>
      <Field label="Notas"><textarea rows={3} value={a.notes || ''} onChange={f('notes')} /></Field>
      <div className="row">
        {activity && <button className="btn danger" onClick={() => { if (confirm('¿Eliminar actividad?')) { remove('activities', a.id); onClose(); } }}>Eliminar</button>}
        {activity && s.vapidPublicKey && <button className="btn" onClick={addReminder}>⏰ Avisar 1 h antes</button>}
        <button className="btn primary grow" disabled={!a.title.trim()} onClick={() => { save('activities', a); onClose(); }}>Guardar</button>
      </div>
    </Modal>
  );
}

export function ReminderForm({ reminder, dayId, onClose }: { reminder?: Reminder; dayId?: string; onClose: () => void }) {
  const s = useStore();
  const day = s.days.find((d) => d.id === (reminder?.day_id || dayId));
  const [r, setR] = useState<Reminder>(reminder || { id: uid(), day_id: dayId || null, profile_id: null, title: '', done: 0, sent: 0, remind_at: day?.date ? new Date(`${day.date}T08:00`).toISOString() : '' });
  return (
    <Modal title={reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'} onClose={onClose}>
      <Field label="¿Qué hay que recordar?"><input value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} placeholder="Llevar pasaportes, reservar cena…" autoFocus /></Field>
      <Field label="Cuándo avisar"><input type="datetime-local" value={isoToLocalInput(r.remind_at)} onChange={(e) => setR({ ...r, remind_at: localToISO(e.target.value), sent: 0 })} /></Field>
      <Field label="Día del crucero">
        <select value={r.day_id || ''} onChange={(e) => setR({ ...r, day_id: e.target.value || null })}>
          <option value="">General</option>
          {s.days.map((d) => <option key={d.id} value={d.id}>Día {d.day_number}{d.port ? ' · ' + d.port : ''}</option>)}
        </select>
      </Field>
      <Field label="Para"><ProfileSelect value={r.profile_id} onChange={(v) => setR({ ...r, profile_id: v })} /></Field>
      <Field label="Notas"><textarea rows={2} value={r.notes || ''} onChange={(e) => setR({ ...r, notes: e.target.value })} /></Field>
      <div className="row">
        {reminder && <button className="btn danger" onClick={() => { remove('reminders', r.id); onClose(); }}>Eliminar</button>}
        <button className="btn primary grow" disabled={!r.title.trim()} onClick={() => { save('reminders', r); onClose(); }}>Guardar</button>
      </div>
    </Modal>
  );
}
