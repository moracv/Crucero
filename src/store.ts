// Estado local-first: todo se guarda en el celular (IndexedDB) y se sincroniza con
// Cloudflare cuando hay internet. Los cambios hechos sin conexión quedan en una cola.
import { useSyncExternalStore } from 'react';
import { get, set, keys } from 'idb-keyval';
import type { Activity, Day, Item, Me, Outfit, OutfitItems, Profile, Reminder, Trip } from './types';

export type Table = 'profiles' | 'trip' | 'days' | 'activities' | 'items' | 'outfits' | 'reminders';

export interface State {
  loaded: boolean;
  authed: boolean | null;
  online: boolean;
  pending: number;
  me: Me | null;
  users: any[];
  profiles: Profile[];
  trip: Trip | null;
  days: Day[];
  activities: Activity[];
  items: Item[];
  outfits: Outfit[];
  reminders: Reminder[];
  settings: { ai_provider?: string; ai_model?: string; has_key?: number | boolean };
  defaultModels: Record<string, string>;
  vapidPublicKey: string;
  viewProfileId: string | null;
}

type Op = { kind: 'put' | 'del'; table: Table; id: string; data?: any } | { kind: 'img'; key: string };

let state: State = {
  loaded: false, authed: null, online: navigator.onLine, pending: 0, me: null, users: [], profiles: [], trip: null, days: [],
  activities: [], items: [], outfits: [], reminders: [], settings: {}, defaultModels: {}, vapidPublicKey: '', viewProfileId: null,
};
const listeners = new Set<() => void>();
let outbox: Op[] = [];
const localImgs = new Map<string, string>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useStore = () => useSyncExternalStore(subscribe, () => state);
export const getState = () => state;

const DATA_KEYS: (keyof State)[] = ['me', 'users', 'profiles', 'trip', 'days', 'activities', 'items', 'outfits', 'reminders', 'settings', 'defaultModels', 'vapidPublicKey'];
let persistTimer: any;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const snap: any = {};
    DATA_KEYS.forEach((k) => (snap[k] = state[k]));
    set('state', snap);
  }, 300);
}

export const uid = () => crypto.randomUUID();

function applyOp(s: any, op: Op) {
  if (op.kind === 'img') return;
  if (op.table === 'trip') { s.trip = op.kind === 'put' ? op.data : null; return; }
  const arr: any[] = s[op.table] || [];
  const i = arr.findIndex((r) => r.id === op.id);
  if (op.kind === 'del') { if (i >= 0) s[op.table] = arr.filter((r) => r.id !== op.id); return; }
  s[op.table] = i >= 0 ? arr.map((r) => (r.id === op.id ? op.data : r)) : [...arr, op.data];
}

async function enqueue(op: Op) {
  // Varias ediciones seguidas de la misma fila: basta con enviar la última
  if (op.kind === 'put') outbox = outbox.filter((o) => !(o.kind === 'put' && o.table === op.table && o.id === op.id));
  outbox.push(op);
  await set('outbox', outbox);
  setState({ pending: outbox.length });
  flush();
}

export function save<T extends { id: string }>(table: Table, row: T): T {
  const data = { ...row, updated_at: Date.now() };
  const s: any = { ...state };
  applyOp(s, { kind: 'put', table, id: row.id, data });
  setState(s);
  persist();
  enqueue({ kind: 'put', table, id: row.id, data });
  return data;
}

export function remove(table: Table, id: string) {
  const s: any = { ...state };
  applyOp(s, { kind: 'del', table, id });
  setState(s);
  persist();
  enqueue({ kind: 'del', table, id });
}

export async function saveImage(blob: Blob): Promise<string> {
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  const key = `${uid()}.${ext}`;
  await set('img:' + key, blob);
  localImgs.set(key, URL.createObjectURL(blob));
  await enqueue({ kind: 'img', key });
  return key;
}

export const imgUrl = (key?: string | null) => (key ? localImgs.get(key) || `/api/img/${key}` : '');

let flushing = false;
export async function flush() {
  if (flushing || !outbox.length) return;
  flushing = true;
  try {
    while (outbox.length) {
      const op = outbox[0];
      let r: Response;
      if (op.kind === 'img') {
        const blob: Blob | undefined = await get('img:' + op.key);
        if (!blob) { outbox.shift(); continue; }
        r = await fetch(`/api/img/${op.key}`, { method: 'PUT', body: blob, headers: { 'content-type': blob.type || 'image/webp' } });
      } else if (op.kind === 'put') {
        r = await fetch(`/api/data/${op.table}/${op.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(op.data) });
      } else {
        r = await fetch(`/api/data/${op.table}/${op.id}`, { method: 'DELETE' });
      }
      if (r.status === 401) { setState({ authed: false }); break; }
      if (r.status >= 500) break; // se reintenta más tarde
      outbox.shift();
      await set('outbox', outbox);
      setState({ pending: outbox.length, online: true });
    }
  } catch {
    setState({ online: false });
  } finally {
    flushing = false;
  }
}

export async function refresh() {
  await flush();
  try {
    const r = await fetch('/api/bootstrap');
    if (r.status === 401) { setState({ authed: false, loaded: true }); return; }
    if (!r.ok) throw new Error('server');
    const d = await r.json();
    const s: any = { ...d, authed: true, loaded: true, online: true };
    for (const op of outbox) applyOp(s, op); // cambios aún no enviados ganan
    if (!state.viewProfileId) s.viewProfileId = d.me?.profile_id || d.profiles?.[0]?.id || null;
    setState(s);
    persist();
  } catch {
    setState({ loaded: true, online: false });
  }
}

export async function init() {
  outbox = (await get('outbox')) || [];
  const cached = await get('state');
  for (const k of (await keys()) as string[]) {
    if (typeof k === 'string' && k.startsWith('img:')) {
      const b: Blob | undefined = await get(k);
      if (b) localImgs.set(k.slice(4), URL.createObjectURL(b));
    }
  }
  if (cached?.me) {
    setState({ ...cached, authed: true, loaded: true, pending: outbox.length, viewProfileId: cached.me.profile_id || cached.profiles?.[0]?.id || null });
  }
  refresh();
  window.addEventListener('online', () => { setState({ online: true }); refresh(); });
  window.addEventListener('offline', () => setState({ online: false }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  setInterval(flush, 30000);
}

export async function logout() {
  await fetch('/api/auth/logout').catch(() => {});
  await set('state', null);
  setState({ authed: false, me: null });
}

export function setViewProfile(id: string) { setState({ viewProfileId: id }); }

export async function setMyProfile(profileId: string) {
  setState({ me: { ...state.me!, profile_id: profileId }, viewProfileId: profileId });
  persist();
  await fetch('/api/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile_id: profileId }) });
}

export function setSettingsLocal(s: State['settings']) { setState({ settings: s }); persist(); }

// ---------- helpers de outfits ----------
export const outfitId = (dayId: string, profileId: string, slot: string) => `${dayId}_${profileId}_${slot}`;
export function getOutfit(dayId: string, profileId: string, slot: 'dia' | 'noche'): OutfitItems {
  const o = state.outfits.find((x) => x.id === outfitId(dayId, profileId, slot));
  if (!o) return {};
  try { return typeof o.items === 'string' ? JSON.parse(o.items) : (o.items as any) || {}; } catch { return {}; }
}
export function parseItems(o?: Outfit): OutfitItems {
  if (!o) return {};
  try { return typeof o.items === 'string' ? JSON.parse(o.items) : (o.items as any) || {}; } catch { return {}; }
}
export const outfitCount = (it: OutfitItems) =>
  ['head', 'eyes', 'outer', 'top', 'dress', 'bottom', 'shoes'].filter((k) => (it as any)[k]).length + (it.accessories?.length || 0);
