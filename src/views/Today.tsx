import { parseBody } from '../components/Body';
import { useState } from 'react';
import { getOutfit, save, useStore } from '../store';
import { Header } from '../components/ui';
import { PortClock, Weather } from '../components/Weather';
import { MiniOutfit } from '../components/OutfitFigure';
import { ProfileSwitch, ReminderForm } from '../components/Forms';
import { actType, dayType } from '../catalog';
import { currentDay, fmtDate, fmtDateTime } from '../util';
import { go } from '../router';
import { missingData } from '../alerts';
import { promptInstall, useCanInstall } from '../install';

export function Today() {
  const s = useStore();
  const [showAlerts, setShowAlerts] = useState(false);
  const [newRem, setNewRem] = useState(false);
  const canInstall = useCanInstall();
  const { day, status, diff } = currentDay(s.trip, s.days);
  const profile = s.profiles.find((p) => p.id === s.viewProfileId);
  const alerts = missingData(s, s.viewProfileId);
  const upcoming = s.reminders
    .filter((r) => !r.done && (!r.profile_id || r.profile_id === s.viewProfileId))
    .sort((a, b) => (a.remind_at || '').localeCompare(b.remind_at || ''))
    .slice(0, 4);
  const acts = day ? s.activities.filter((a) => a.day_id === day.id && (!a.profile_id || a.profile_id === s.viewProfileId)).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')) : [];

  return (
    <div className="page">
      <Header title={s.trip?.name || 'Mi Crucero'} sub={[s.trip?.cruise_line, s.trip?.ship, s.trip?.cabin && 'Cabina ' + s.trip.cabin].filter(Boolean).join(' · ')}
        right={<button className="icon-btn" onClick={() => go('ajustes')} aria-label="Ajustes">⚙️</button>} />

      {status === 'antes' && <div className="hero"><b>{diff}</b><span>{diff === 1 ? 'día' : 'días'} para zarpar 🛳️</span></div>}
      {status === 'despues' && <div className="hero small-hero">¡Crucero terminado! Esperamos que lo hayan disfrutado 🌅</div>}

      {canInstall && (
        <section className="card install-card">
          <span>📲</span>
          <div className="grow"><b>Instala Mi Crucero</b><small>Ábrela como app desde tu pantalla de inicio, también sin internet.</small></div>
          <button className="btn primary small" onClick={promptInstall}>Instalar</button>
        </section>
      )}

      <ProfileSwitch />

      {day && (
        <section className="card day-hero" onClick={() => go(`dia/${day.id}`)}>
          <div className="day-hero-top">
            <span className="badge">{dayType(day.type).icon} Día {day.day_number}</span>
            <span className="muted">{fmtDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <h2>{day.type === 'navegacion' ? 'Día en altamar' : day.port || 'Puerto por definir'}</h2>
          <div className="times">
            {day.arrive && <span>Llegada {day.arrive}</span>}
            {day.depart && <span>Salida {day.depart}</span>}
            {day.all_aboard && <span className="warn-text">All aboard {day.all_aboard}</span>}
          </div>
          <Weather day={day} />
          {status === 'durante' && <PortClock tz={day.tz} />}
        </section>
      )}

      {day && profile && (
        <section className="card">
          <div className="card-head"><h3>👕 Outfits de {profile.name}</h3></div>
          <div className="outfit-pair">
            {(['dia', 'noche'] as const).map((slot) => (
              <div key={slot} className="outfit-mini" onClick={() => go(`outfit/${day.id}/${slot}/${profile.id}`)}>
                <MiniOutfit gender={profile.gender} outfit={getOutfit(day.id, profile.id, slot)} items={s.items} body={parseBody(profile.gender, profile.body)} />
                <small>{slot === 'dia' ? '☀️ Día' : '🌙 Noche'}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {day && (
        <section className="card">
          <div className="card-head"><h3>📅 Plan del día</h3><button className="link" onClick={() => go(`dia/${day.id}`)}>Ver día</button></div>
          {acts.length ? acts.map((a) => (
            <div key={a.id} className="act-row">
              <span className="act-time">{a.start_time || '--:--'}</span>
              <span>{actType(a.type).icon} {a.title}</span>
            </div>
          )) : <p className="muted small">Sin actividades todavía.</p>}
        </section>
      )}

      <section className="card">
        <div className="card-head"><h3>⏰ Recordatorios</h3><button className="link" onClick={() => go('avisos')}>Ver todos</button></div>
        {upcoming.map((r) => (
          <label key={r.id} className="rem-row">
            <input type="checkbox" checked={!!r.done} onChange={() => save('reminders', { ...r, done: 1 })} />
            <span>{r.title}<small>{fmtDateTime(r.remind_at)}</small></span>
          </label>
        ))}
        {!upcoming.length && <p className="muted small">Nada pendiente.</p>}
        <button className="btn ghost" onClick={() => setNewRem(true)}>+ Recordatorio</button>
      </section>

      {alerts.length > 0 && (
        <section className="card alerts">
          <div className="card-head" onClick={() => setShowAlerts(!showAlerts)}>
            <h3>⚠️ Datos pendientes ({alerts.length})</h3><span>{showAlerts ? '▲' : '▼'}</span>
          </div>
          {(showAlerts ? alerts : alerts.slice(0, 3)).map((a, i) => (
            <button key={i} className={'alert-row ' + a.level} onClick={() => go(a.link)}>{a.text} ›</button>
          ))}
        </section>
      )}
      {newRem && <ReminderForm dayId={day?.id} onClose={() => setNewRem(false)} />}
    </div>
  );
}
