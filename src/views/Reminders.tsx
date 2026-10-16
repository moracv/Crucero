import { useState } from 'react';
import { save, useStore } from '../store';
import type { Reminder } from '../types';
import { Empty, Header } from '../components/ui';
import { ReminderForm } from '../components/Forms';
import { fmtDateTime } from '../util';

export function Reminders() {
  const s = useStore();
  const [edit, setEdit] = useState<Reminder | 'new' | null>(null);
  const [showDone, setShowDone] = useState(false);
  const list = s.reminders
    .filter((r) => showDone || !r.done)
    .sort((a, b) => (a.remind_at || '').localeCompare(b.remind_at || ''));
  const dayLabel = (id?: string | null) => { const d = s.days.find((x) => x.id === id); return d ? `Día ${d.day_number}${d.port ? ' · ' + d.port : ''}` : 'General'; };
  const pname = (pid?: string | null) => (pid ? s.profiles.find((p) => p.id === pid)?.name : 'Ambos');
  return (
    <div className="page">
      <Header title="Recordatorios" backBtn right={<button className="btn primary small" onClick={() => setEdit('new')}>+ Nuevo</button>} />
      <label className="toggle"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /><span>Mostrar completados</span></label>
      {!list.length && <Empty>Sin recordatorios pendientes 🎉</Empty>}
      <section className="card">
        {list.map((r) => (
          <div key={r.id} className="rem-row">
            <input type="checkbox" checked={!!r.done} onChange={() => save('reminders', { ...r, done: r.done ? 0 : 1 })} />
            <span className={'grow' + (r.done ? ' done' : '')} onClick={() => setEdit(r)}>
              {r.title}
              <small>{fmtDateTime(r.remind_at)} · {dayLabel(r.day_id)} · {pname(r.profile_id)} {r.sent ? '· 🔔 enviado' : ''}</small>
            </span>
          </div>
        ))}
      </section>
      {edit && <ReminderForm reminder={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
