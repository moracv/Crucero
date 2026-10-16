import { useStore, setMyProfile } from './store';
import { useRoute, go } from './router';
import { Login } from './views/Login';
import { Setup } from './views/Setup';
import { Today } from './views/Today';
import { Itinerary } from './views/Itinerary';
import { DayDetail } from './views/DayDetail';
import { OutfitBuilder } from './views/OutfitBuilder';
import { Outfits } from './views/Outfits';
import { Catalog } from './views/Catalog';
import { Packing } from './views/Packing';
import { Settings } from './views/Settings';
import { Reminders } from './views/Reminders';

const TABS = [
  { id: 'hoy', icon: '🏠', label: 'Hoy' },
  { id: 'itinerario', icon: '🗓️', label: 'Itinerario' },
  { id: 'outfits', icon: '🧍', label: 'Outfits' },
  { id: 'ropa', icon: '👕', label: 'Ropa' },
  { id: 'maleta', icon: '🧳', label: 'Maleta' },
];

function PickProfile() {
  const s = useStore();
  return (
    <div className="login">
      <h1>¿Quién eres?</h1>
      {s.profiles.map((p) => (
        <button key={p.id} className="btn block big" onClick={() => setMyProfile(p.id)}>{p.gender === 'M' ? '👩' : '👨'} {p.name}</button>
      ))}
    </div>
  );
}

export function App() {
  const s = useStore();
  const [view, a, b, c] = useRoute();

  if (!s.loaded) return <div className="splash"><img src="/icon-192.png" alt="" /></div>;
  if (s.authed === false) return <Login />;
  if (s.authed === null) return <div className="login"><p>Sin conexión. Conéctate a internet la primera vez para iniciar sesión.</p></div>;
  if (!s.trip || !s.profiles.length || view === 'setup') return <Setup />;
  if (!s.me?.profile_id && s.profiles.length) return <PickProfile />;

  let page;
  switch (view) {
    case 'itinerario': page = <Itinerary />; break;
    case 'dia': page = <DayDetail id={a} />; break;
    case 'outfit': page = <OutfitBuilder dayId={a} slot={b as any} profileId={c} />; break;
    case 'outfits': page = <Outfits />; break;
    case 'ropa': page = <Catalog />; break;
    case 'maleta': page = <Packing />; break;
    case 'ajustes': page = <Settings />; break;
    case 'avisos': page = <Reminders />; break;
    default: page = <Today />;
  }
  const active = view === 'dia' ? 'itinerario' : view === 'outfit' ? 'outfits' : view;

  return (
    <>
      {!s.online && <div className="offline">Sin conexión · {s.pending} cambio(s) por sincronizar</div>}
      <main>{page}</main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={active === t.id ? 'active' : ''} onClick={() => go(t.id)}>
            <span>{t.icon}</span><small>{t.label}</small>
          </button>
        ))}
      </nav>
    </>
  );
}
