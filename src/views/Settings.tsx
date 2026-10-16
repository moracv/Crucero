import { useEffect, useState } from 'react';
import { flush, logout, refresh, setMyProfile, setSettingsLocal, useStore } from '../store';
import { Field, Header } from '../components/ui';
import { go } from '../router';

function urlB64ToUint8(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function Notifications() {
  const s = useStore();
  const [state, setState] = useState<'?' | 'on' | 'off' | 'denied' | 'unsupported'>('?');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setState('unsupported');
    if (Notification.permission === 'denied') return setState('denied');
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((sub) => setState(sub ? 'on' : 'off'));
  }, []);

  async function enable() {
    setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return setState('denied');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(s.vapidPublicKey) });
      const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error('El servidor no guardó la suscripción');
      setState('on');
    } catch (e: any) { setMsg(e.message); }
  }
  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState('off');
  }
  async function test() {
    const r = await fetch('/api/push/test', { method: 'POST' });
    const d = await r.json();
    setMsg(r.ok ? `Enviada a ${d.sent} dispositivo(s)` : d.error);
  }

  return (
    <section className="card">
      <h3>🔔 Notificaciones push</h3>
      {!s.vapidPublicKey && <p className="muted small">El servidor aún no tiene claves VAPID configuradas.</p>}
      {state === 'unsupported' && <p className="muted small">Este navegador no soporta notificaciones. En Android usa Chrome e instala la app.</p>}
      {state === 'denied' && <p className="error">Bloqueaste las notificaciones. Actívalas en los ajustes del sitio en Chrome.</p>}
      {state === 'off' && s.vapidPublicKey && <button className="btn primary block" onClick={enable}>Activar en este celular</button>}
      {state === 'on' && (
        <div className="row">
          <button className="btn" onClick={test}>Enviar prueba</button>
          <button className="btn ghost" onClick={disable}>Desactivar</button>
        </div>
      )}
      {msg && <p className="muted small">{msg}</p>}
      <p className="muted small">Los recordatorios se revisan cada 5 minutos. En el barco necesitas datos o el wifi del crucero para recibirlos.</p>
    </section>
  );
}

function AISettings() {
  const s = useStore();
  const [provider, setProvider] = useState(s.settings?.ai_provider || 'anthropic');
  const [model, setModel] = useState(s.settings?.ai_model || '');
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  async function submit() {
    const body: any = { ai_provider: provider, ai_model: model };
    if (key) body.ai_key = key;
    const r = await fetch('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return setMsg('No se pudo guardar (¿sin conexión?)');
    const d = await r.json();
    setSettingsLocal({ ai_provider: provider, ai_model: model, has_key: d.has_key });
    setKey('');
    setMsg('Guardado ✓');
  }
  return (
    <section className="card">
      <h3>✨ Inteligencia artificial</h3>
      <p className="muted small">Para sugerir outfits según el puerto, el clima y las actividades. Cada perfil usa su propia API key.</p>
      <Field label="Proveedor">
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="anthropic">Claude (Anthropic)</option>
          <option value="openai">GPT (OpenAI)</option>
          <option value="gemini">Gemini (Google)</option>
        </select>
      </Field>
      <Field label={`API key ${s.settings?.has_key ? '(ya configurada; deja vacío para conservarla)' : ''}`}>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
      </Field>
      <Field label="Modelo (opcional)"><input value={model} onChange={(e) => setModel(e.target.value)} placeholder={s.defaultModels?.[provider] || ''} /></Field>
      <button className="btn primary block" onClick={submit}>Guardar</button>
      {msg && <p className="muted small">{msg}</p>}
    </section>
  );
}

export function Settings() {
  const s = useStore();
  return (
    <div className="page">
      <Header title="Ajustes" backBtn />
      <section className="card">
        <h3>👤 Cuenta</h3>
        <p>{s.me?.name} <small className="muted">({s.me?.email})</small></p>
        <Field label="Yo soy">
          <select value={s.me?.profile_id || ''} onChange={(e) => setMyProfile(e.target.value)}>
            <option value="">—</option>
            {s.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="row">
          <button className="btn" onClick={() => go('setup')}>🛳️ Configurar crucero</button>
          <button className="btn ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </section>
      <Notifications />
      <AISettings />
      <section className="card">
        <h3>🔄 Sincronización</h3>
        <p className="small">{s.online ? '🟢 En línea' : '🔴 Sin conexión — los cambios se guardan en el celular'}</p>
        <p className="small">{s.pending ? `${s.pending} cambio(s) pendiente(s) de subir` : 'Todo sincronizado'}</p>
        <button className="btn" onClick={async () => { await flush(); await refresh(); }}>Sincronizar ahora</button>
      </section>
    </div>
  );
}
