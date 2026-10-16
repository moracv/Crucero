import { clearCookie, readSession, sessionCookie, verifyGoogle } from './auth';
import { sendPush } from './push';
import { DEFAULT_MODELS, suggestOutfit } from './ai';
import { json } from './util';

export interface Env {
  DB: D1Database;
  FOTOS: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  ALLOWED_EMAILS: string;
  SESSION_SECRET: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_JWK: string;
  VAPID_SUBJECT: string;
  DEV_LOGIN?: string;
}

// Tablas que el cliente sincroniza y las columnas que puede escribir
const TABLES: Record<string, string[]> = {
  profiles: ['name', 'gender', 'color', 'body'],
  trip: ['name', 'cruise_line', 'ship', 'start_date', 'nights', 'cabin', 'booking', 'embark_port', 'notes'],
  days: ['day_number', 'date', 'type', 'port', 'country', 'lat', 'lon', 'tz', 'arrive', 'depart', 'all_aboard', 'dress_code', 'notes'],
  activities: ['day_id', 'profile_id', 'start_time', 'end_time', 'title', 'type', 'location', 'included', 'price', 'currency', 'booked', 'meeting_point', 'notes'],
  items: ['profile_id', 'kind', 'category', 'name', 'color', 'tags', 'image_key', 'packed', 'qty', 'notes', 'fit'],
  outfits: ['day_id', 'profile_id', 'slot', 'items', 'notes'],
  reminders: ['day_id', 'profile_id', 'remind_at', 'title', 'notes', 'done', 'sent'],
};

const ID_RE = /^[A-Za-z0-9_-]{1,120}$/;
const IMG_RE = /^[A-Za-z0-9-]{1,80}\.(webp|png|jpg)$/;

async function login(env: Env, req: Request, g: { email: string; name: string; picture: string }) {
  const allowed = (env.ALLOWED_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const existing: any = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(g.email).first();
  if (allowed.length) {
    if (!allowed.includes(g.email)) return json({ error: 'Este correo no está autorizado' }, 403);
  } else if (!existing) {
    const n: any = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
    if (n.n >= 2) return json({ error: 'La app ya tiene sus 2 usuarios. Agrega tu correo en ALLOWED_EMAILS.' }, 403);
  }
  let uid = existing?.id;
  if (!uid) {
    uid = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO users (id,email,name,picture,created_at) VALUES (?,?,?,?,?)').bind(uid, g.email, g.name, g.picture, Date.now()).run();
  } else {
    await env.DB.prepare('UPDATE users SET name=?, picture=? WHERE id=?').bind(g.name, g.picture, uid).run();
  }
  const secure = new URL(req.url).protocol === 'https:';
  return json({ ok: true }, 200, { 'set-cookie': await sessionCookie(uid, env.SESSION_SECRET, secure) });
}

async function bootstrap(env: Env, user: any) {
  const all = (sql: string) => env.DB.prepare(sql).all().then((r) => r.results);
  const [profiles, trip, days, activities, items, outfits, reminders, settings, users] = await Promise.all([
    all('SELECT * FROM profiles'),
    env.DB.prepare('SELECT * FROM trip LIMIT 1').first(),
    all('SELECT * FROM days ORDER BY day_number'),
    all('SELECT * FROM activities ORDER BY start_time'),
    all('SELECT * FROM items'),
    all('SELECT * FROM outfits'),
    all('SELECT * FROM reminders ORDER BY remind_at'),
    env.DB.prepare("SELECT ai_provider, ai_model, ai_key IS NOT NULL AND ai_key<>'' AS has_key FROM user_settings WHERE user_id=?").bind(user.id).first(),
    all('SELECT id,name,email,picture,profile_id FROM users'),
  ]);
  return {
    me: { id: user.id, email: user.email, name: user.name, picture: user.picture, profile_id: user.profile_id },
    users, profiles, trip, days, activities, items, outfits, reminders,
    settings: settings || {},
    defaultModels: DEFAULT_MODELS,
    vapidPublicKey: env.VAPID_PUBLIC_KEY || '',
  };
}

async function upsert(env: Env, table: string, id: string, body: any) {
  const cols = TABLES[table].filter((c) => c in body);
  const values = cols.map((c) => (body[c] === undefined ? null : body[c]));
  const names = ['id', ...cols, 'updated_at'];
  const sql = `INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})
    ON CONFLICT(id) DO UPDATE SET ${[...cols, 'updated_at'].map((c) => `${c}=excluded.${c}`).join(',')}`;
  await env.DB.prepare(sql).bind(id, ...values, Number(body.updated_at) || Date.now()).run();
}

async function processReminders(env: Env) {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return;
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    "SELECT r.*, d.port, d.day_number FROM reminders r LEFT JOIN days d ON d.id=r.day_id WHERE r.sent=0 AND r.done=0 AND r.remind_at IS NOT NULL AND r.remind_at<>'' AND r.remind_at<=? LIMIT 50",
  ).bind(now).all();
  for (const r of results as any[]) {
    const subs = r.profile_id
      ? (await env.DB.prepare('SELECT s.* FROM push_subs s JOIN users u ON u.id=s.user_id WHERE u.profile_id=?').bind(r.profile_id).all()).results
      : (await env.DB.prepare('SELECT * FROM push_subs').all()).results;
    const body = [r.notes, r.day_number ? `Día ${r.day_number}${r.port ? ' · ' + r.port : ''}` : ''].filter(Boolean).join('\n');
    for (const s of subs as any[]) {
      try {
        const status = await sendPush(s, { title: '⏰ ' + r.title, body, url: r.day_id ? `/#/dia/${r.day_id}` : '/#/avisos' }, env);
        if (status === 404 || status === 410) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(s.endpoint).run();
      } catch (e) {
        console.error('push', e);
      }
    }
    await env.DB.prepare('UPDATE reminders SET sent=1 WHERE id=?').bind(r.id).run();
  }
}

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/config') return json({ googleClientId: env.GOOGLE_CLIENT_ID || '', devLogin: env.DEV_LOGIN === '1' });

  if (p === '/api/auth/google' && m === 'POST') {
    const { credential } = await req.json<any>();
    if (!env.GOOGLE_CLIENT_ID) return json({ error: 'Falta configurar GOOGLE_CLIENT_ID' }, 500);
    return login(env, req, await verifyGoogle(credential, env.GOOGLE_CLIENT_ID));
  }
  if (p === '/api/auth/dev' && m === 'POST' && env.DEV_LOGIN === '1') {
    const { email } = await req.json<any>();
    const e = String(email || '').toLowerCase().trim();
    return login(env, req, { email: e, name: e.split('@')[0], picture: '' });
  }
  if (p === '/api/auth/logout') return json({ ok: true }, 200, { 'set-cookie': clearCookie() });

  const uid = env.SESSION_SECRET ? await readSession(req, env.SESSION_SECRET) : null;
  const user: any = uid ? await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(uid).first() : null;
  if (!user) return json({ error: 'No autenticado' }, 401);

  if (p === '/api/bootstrap') return json(await bootstrap(env, user));

  if (p === '/api/me' && m === 'PUT') {
    const b = await req.json<any>();
    await env.DB.prepare('UPDATE users SET profile_id=? WHERE id=?').bind(b.profile_id ?? null, user.id).run();
    return json({ ok: true });
  }

  if (p === '/api/settings' && m === 'PUT') {
    const b = await req.json<any>();
    const cur: any = await env.DB.prepare('SELECT * FROM user_settings WHERE user_id=?').bind(user.id).first();
    const key = b.ai_key === undefined ? cur?.ai_key ?? null : b.ai_key;
    await env.DB.prepare(
      'INSERT INTO user_settings (user_id,ai_provider,ai_key,ai_model,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET ai_provider=excluded.ai_provider, ai_key=excluded.ai_key, ai_model=excluded.ai_model, updated_at=excluded.updated_at',
    ).bind(user.id, b.ai_provider || null, key, b.ai_model || null, Date.now()).run();
    return json({ ok: true, has_key: !!key });
  }

  const dm = p.match(/^\/api\/data\/(\w+)\/([^/]+)$/);
  if (dm) {
    const [, table, id] = dm;
    if (!TABLES[table] || !ID_RE.test(id)) return json({ error: 'Ruta inválida' }, 400);
    if (m === 'PUT') {
      await upsert(env, table, id, await req.json<any>());
      return json({ ok: true });
    }
    if (m === 'DELETE') {
      if (table === 'items') {
        const it: any = await env.DB.prepare('SELECT image_key FROM items WHERE id=?').bind(id).first();
        if (it?.image_key) await env.FOTOS.delete(it.image_key);
      }
      if (table === 'days') {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM activities WHERE day_id=?').bind(id),
          env.DB.prepare('DELETE FROM outfits WHERE day_id=?').bind(id),
          env.DB.prepare('DELETE FROM reminders WHERE day_id=?').bind(id),
        ]);
      }
      await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
      return json({ ok: true });
    }
  }

  const im = p.match(/^\/api\/img\/([^/]+)$/);
  if (im) {
    const key = im[1];
    if (!IMG_RE.test(key)) return json({ error: 'Clave inválida' }, 400);
    if (m === 'PUT') {
      const buf = await req.arrayBuffer();
      if (buf.byteLength > 5 * 1024 * 1024) return json({ error: 'Imagen demasiado grande' }, 413);
      await env.FOTOS.put(key, buf, { httpMetadata: { contentType: req.headers.get('content-type') || 'image/webp' } });
      return json({ ok: true });
    }
    const obj = await env.FOTOS.get(key);
    if (!obj) return new Response('No encontrada', { status: 404 });
    return new Response(obj.body, {
      headers: { 'content-type': obj.httpMetadata?.contentType || 'image/webp', 'cache-control': 'private, max-age=31536000, immutable' },
    });
  }

  if (p === '/api/push/subscribe' && m === 'POST') {
    const s = await req.json<any>();
    await env.DB.prepare('INSERT OR REPLACE INTO push_subs (endpoint,user_id,p256dh,auth,created_at) VALUES (?,?,?,?,?)')
      .bind(s.endpoint, user.id, s.keys.p256dh, s.keys.auth, Date.now()).run();
    return json({ ok: true });
  }
  if (p === '/api/push/unsubscribe' && m === 'POST') {
    const s = await req.json<any>();
    await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(s.endpoint).run();
    return json({ ok: true });
  }
  if (p === '/api/push/test' && m === 'POST') {
    if (!env.VAPID_PRIVATE_JWK) return json({ error: 'Faltan las claves VAPID en el servidor' }, 500);
    const subs = (await env.DB.prepare('SELECT * FROM push_subs WHERE user_id=?').bind(user.id).all()).results as any[];
    const statuses = [];
    for (const s of subs) statuses.push(await sendPush(s, { title: '🛳️ Notificación de prueba', body: '¡Los recordatorios funcionan!', url: '/' }, env));
    return json({ ok: true, sent: subs.length, statuses });
  }

  if (p === '/api/ai/suggest' && m === 'POST') {
    const s: any = await env.DB.prepare('SELECT * FROM user_settings WHERE user_id=?').bind(user.id).first();
    if (!s?.ai_provider || !s?.ai_key) return json({ error: 'Configura tu proveedor de IA y API key en Ajustes' }, 400);
    try {
      return json(await suggestOutfit(env.DB, s, await req.json<any>()));
    } catch (e: any) {
      return json({ error: e.message || String(e) }, 502);
    }
  }

  return json({ error: 'No encontrado' }, 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return await handle(req, env);
    } catch (e: any) {
      console.error(e);
      return json({ error: e?.message || String(e) }, 500);
    }
  },
  async scheduled(_evt: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(processReminders(env));
  },
} satisfies ExportedHandler<Env>;
