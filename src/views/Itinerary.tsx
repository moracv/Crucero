import { outfitCount, getOutfit, useStore } from '../store';
import { Empty, Header } from '../components/ui';
import { dayType } from '../catalog';
import { fmtDate, todayISO } from '../util';
import { go } from '../router';

export function Itinerary() {
  const s = useStore();
  const pid = s.viewProfileId;
  return (
    <div className="page">
      <Header title="Itinerario" sub={s.trip ? `${s.trip.nights} noches · ${s.trip.cruise_line || ''} ${s.trip.ship || ''}` : ''}
        right={<button className="icon-btn" onClick={() => go('setup')} aria-label="Configurar">✏️</button>} />
      {!s.days.length && <Empty>Aún no hay días. <button className="link" onClick={() => go('setup')}>Configura el crucero</button></Empty>}
      <div className="timeline">
        {s.days.map((d) => {
          const acts = s.activities.filter((a) => a.day_id === d.id);
          const paid = acts.filter((a) => !a.included && a.price).reduce((n, a) => n + Number(a.price || 0), 0);
          const okDia = pid && outfitCount(getOutfit(d.id, pid, 'dia')) > 0;
          const okNoche = pid && outfitCount(getOutfit(d.id, pid, 'noche')) > 0;
          return (
            <button key={d.id} className={'day-card' + (d.date === todayISO() ? ' today' : '')} onClick={() => go(`dia/${d.id}`)}>
              <div className="day-num"><b>{d.day_number}</b><small>{fmtDate(d.date, { day: 'numeric', month: 'short' })}</small></div>
              <div className="day-info">
                <div className="day-title">{dayType(d.type).icon} {d.type === 'navegacion' ? 'Día en altamar' : d.port || <i className="muted">Puerto por definir</i>}</div>
                <div className="muted small">
                  {[d.arrive && `🛬 ${d.arrive}`, d.depart && `🛫 ${d.depart}`, d.dress_code && d.dress_code !== 'casual' && `🎩 ${d.dress_code}`].filter(Boolean).join('  ')}
                </div>
                <div className="pills">
                  <span className="pill">{acts.length} actividades</span>
                  {paid > 0 && <span className="pill">💵 {paid.toFixed(0)}</span>}
                  <span className={'pill ' + (okDia ? 'ok' : 'off')}>☀️ outfit</span>
                  <span className={'pill ' + (okNoche ? 'ok' : 'off')}>🌙 outfit</span>
                </div>
              </div>
              <span className="chev">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
