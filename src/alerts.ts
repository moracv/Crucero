import type { State } from './store';
import { outfitCount, outfitId, parseItems } from './store';

export interface Alert { text: string; link: string; level: 'info' | 'warn' }

/** Detecta datos faltantes en el itinerario para recordárselos al usuario. */
export function missingData(s: State, profileId?: string | null): Alert[] {
  const out: Alert[] = [];
  if (!s.trip?.start_date) out.push({ text: 'Configura la fecha de inicio del crucero', link: 'setup', level: 'warn' });
  if (!s.items.some((i) => i.kind === 'ropa')) out.push({ text: 'Tu catálogo de ropa está vacío: sube fotos de tu ropa', link: 'ropa', level: 'info' });
  for (const d of s.days) {
    const pre = `Día ${d.day_number}`;
    if (d.type === 'puerto' && !d.port) out.push({ text: `${pre}: falta el puerto`, link: `dia/${d.id}`, level: 'warn' });
    if (d.type === 'puerto' && d.port && (!d.arrive || !d.all_aboard)) out.push({ text: `${pre}: falta la hora de llegada o de "all aboard" en ${d.port}`, link: `dia/${d.id}`, level: 'warn' });
    for (const a of s.activities.filter((x) => x.day_id === d.id)) {
      if (!a.start_time) out.push({ text: `${pre}: "${a.title}" no tiene hora`, link: `dia/${d.id}`, level: 'warn' });
      if (a.type === 'tour' && !a.included && !a.booked) out.push({ text: `${pre}: el tour "${a.title}" no está reservado`, link: `dia/${d.id}`, level: 'warn' });
    }
    if (profileId) {
      for (const slot of ['dia', 'noche'] as const) {
        const o = s.outfits.find((x) => x.id === outfitId(d.id, profileId, slot));
        if (!o || !outfitCount(parseItems(o))) out.push({ text: `${pre}: falta el outfit de ${slot === 'dia' ? 'día' : 'noche'}`, link: `outfit/${d.id}/${slot}/${profileId}`, level: 'info' });
      }
    }
  }
  return out;
}
