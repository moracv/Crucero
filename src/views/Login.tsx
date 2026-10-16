import { useEffect, useRef, useState } from 'react';
import { refresh } from '../store';

declare global { interface Window { google?: any } }

export function Login() {
  const [cfg, setCfg] = useState<{ googleClientId: string; devLogin: boolean } | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const btn = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setCfg).catch(() => setError('Sin conexión. Conéctate a internet para iniciar sesión la primera vez.'));
  }, []);

  useEffect(() => {
    if (!cfg?.googleClientId) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (resp: any) => {
          const r = await fetch('/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential: resp.credential }) });
          const d = await r.json();
          if (!r.ok) return setError(d.error || 'No se pudo iniciar sesión');
          refresh();
        },
      });
      window.google.accounts.id.renderButton(btn.current, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es' });
    };
    document.head.appendChild(s);
  }, [cfg]);

  async function devLogin() {
    const r = await fetch('/api/auth/dev', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    const d = await r.json();
    if (!r.ok) return setError(d.error);
    refresh();
  }

  return (
    <div className="login">
      <img src="/icon-192.png" alt="" width={96} height={96} className="login-logo" />
      <h1>Mi Crucero</h1>
      <p className="muted">Itinerario, outfits y equipaje para el viaje 🌴</p>
      <div ref={btn} className="gbtn" />
      {cfg && !cfg.googleClientId && !cfg.devLogin && <p className="error">Falta configurar GOOGLE_CLIENT_ID en Cloudflare.</p>}
      {cfg?.devLogin && (
        <div className="card dev">
          <small>Modo desarrollo</small>
          <input placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn primary" onClick={devLogin}>Entrar</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
