import { b64url, b64urlDecode, enc } from './util';

const COOKIE = 'sid';
// Sesión larga: en altamar no siempre hay internet para volver a iniciar sesión
const MAX_AGE = 60 * 60 * 24 * 120;

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function sessionCookie(uid: string, secret: string, secure: boolean): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + MAX_AGE })));
  const sig = b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload)));
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function readSession(req: Request, secret: string): Promise<string | null> {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(/(?:^|;\s*)sid=([^;]+)/);
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64urlDecode(sig), enc.encode(payload));
  if (!ok) return null;
  const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
  if (data.exp < Date.now() / 1000) return null;
  return data.uid;
}

export interface GoogleUser { email: string; name: string; picture: string }

// Valida el ID token de "Iniciar sesión con Google" usando el endpoint oficial de Google
export async function verifyGoogle(credential: string, clientId: string): Promise<GoogleUser> {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) throw new Error('Token de Google inválido');
  const t: any = await r.json();
  if (t.aud !== clientId) throw new Error('Token emitido para otra aplicación');
  if (t.email_verified !== 'true' && t.email_verified !== true) throw new Error('Correo no verificado');
  if (Number(t.exp) < Date.now() / 1000) throw new Error('Token expirado');
  return { email: String(t.email).toLowerCase(), name: t.name || t.email, picture: t.picture || '' };
}
