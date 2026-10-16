import type { Day, Trip } from './types';

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

export function fmtDate(iso?: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return 'Sin fecha';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es', opts);
}

export function fmtDateTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Convierte "YYYY-MM-DDTHH:mm" local del celular a ISO UTC */
export const localToISO = (v: string) => (v ? new Date(v).toISOString() : '');
export function isoToLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function currentDay(trip: Trip | null, days: Day[]): { day?: Day; status: 'antes' | 'durante' | 'despues' | 'sin-fecha'; diff: number } {
  if (!trip?.start_date || !days.length) return { day: days[0], status: 'sin-fecha', diff: 0 };
  const t = todayISO();
  const diff = daysBetween(t, trip.start_date);
  if (diff > 0) return { day: days[0], status: 'antes', diff };
  const d = days.find((x) => x.date === t);
  if (d) return { day: d, status: 'durante', diff: 0 };
  return { day: days[days.length - 1], status: 'despues', diff };
}

export const money = (n?: number | null, cur = 'USD') => (n == null || n === ('' as any) ? '' : `${cur} ${Number(n).toFixed(2)}`);
