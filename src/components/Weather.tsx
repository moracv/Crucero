import { useEffect, useState } from 'react';
import type { Day } from '../types';
import { daysBetween, todayISO } from '../util';

const CODES: [number[], string, string][] = [
  [[0], '☀️', 'Despejado'], [[1, 2], '🌤️', 'Parcialmente nublado'], [[3], '☁️', 'Nublado'], [[45, 48], '🌫️', 'Neblina'],
  [[51, 53, 55, 56, 57], '🌦️', 'Llovizna'], [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', 'Lluvia'], [[95, 96, 99], '⛈️', 'Tormenta'],
];
const describe = (c: number) => { const m = CODES.find(([cs]) => cs.includes(c)); return m ? { icon: m[1], text: m[2] } : { icon: '🌡️', text: '' }; };

export interface WeatherInfo { icon: string; text: string; max: number; min: number; rain: number }

export function useWeather(day?: Day): { w?: WeatherInfo; note?: string } {
  const [res, setRes] = useState<{ w?: WeatherInfo; note?: string }>({});
  useEffect(() => {
    setRes({});
    if (!day?.lat || !day?.lon || !day.date) return;
    const diff = daysBetween(todayISO(), day.date);
    if (diff > 15) { setRes({ note: `Pronóstico disponible ${diff - 15} días antes` }); return; }
    if (diff < -1) return;
    const key = `wx:${day.lat},${day.lon},${day.date}`;
    const cached = localStorage.getItem(key);
    if (cached) { const c = JSON.parse(cached); if (Date.now() - c.t < 3 * 3600e3) { setRes({ w: c.w }); return; } }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${day.lat}&longitude=${day.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${day.date}&end_date=${day.date}`;
    fetch(url).then((r) => r.json()).then((d) => {
      const dd = d.daily;
      if (!dd) return;
      const w = { ...describe(dd.weather_code[0]), max: Math.round(dd.temperature_2m_max[0]), min: Math.round(dd.temperature_2m_min[0]), rain: dd.precipitation_probability_max[0] ?? 0 };
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), w }));
      setRes({ w });
    }).catch(() => cached && setRes({ w: JSON.parse(cached).w }));
  }, [day?.lat, day?.lon, day?.date]);
  return res;
}

export const weatherText = (w?: WeatherInfo) => (w ? `${w.text}, ${w.min}–${w.max}°C, ${w.rain}% prob. de lluvia` : '');

export function Weather({ day }: { day?: Day }) {
  const { w, note } = useWeather(day);
  if (w) return <div className="weather"><span className="wx-icon">{w.icon}</span><div><b>{w.min}° / {w.max}°C</b><small>{w.text} · 💧{w.rain}%</small></div></div>;
  if (note) return <div className="weather muted small">🌡️ {note}</div>;
  return null;
}

export function PortClock({ tz }: { tz?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!tz) return null;
  try {
    const there = new Date(now).toLocaleTimeString('es', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    const offset = (zone?: string) => {
      const s = new Date(now).toLocaleString('en-US', { timeZone: zone, hour12: false });
      return new Date(s).getTime();
    };
    const diffH = Math.round((offset(tz) - offset(undefined)) / 3600e3);
    return <div className="clock">🕐 Hora local: <b>{there}</b>{diffH !== 0 && <small> ({diffH > 0 ? '+' : ''}{diffH} h vs. tu celular)</small>}</div>;
  } catch {
    return null;
  }
}
