import { parseBody } from '../components/Body';
import { getOutfit, useStore } from '../store';
import { Empty, Header } from '../components/ui';
import { ProfileSwitch } from '../components/Forms';
import { MiniOutfit } from '../components/OutfitFigure';
import { fmtDate } from '../util';
import { go } from '../router';

export function Outfits() {
  const s = useStore();
  const profile = s.profiles.find((p) => p.id === s.viewProfileId);
  return (
    <div className="page">
      <Header title="Outfits" sub="Toca un outfit para armarlo" />
      <ProfileSwitch />
      {!profile && <Empty>Configura los perfiles primero.</Empty>}
      {profile && s.days.map((d) => (
        <section key={d.id} className="card">
          <div className="card-head">
            <h3>Día {d.day_number} · {d.type === 'navegacion' ? 'Altamar' : d.port || '—'}</h3>
            <small className="muted">{fmtDate(d.date)}</small>
          </div>
          <div className="outfit-pair">
            {(['dia', 'noche'] as const).map((slot) => (
              <div key={slot} className="outfit-mini" onClick={() => go(`outfit/${d.id}/${slot}/${profile.id}`)}>
                <MiniOutfit gender={profile.gender} outfit={getOutfit(d.id, profile.id, slot)} items={s.items} body={parseBody(profile.gender, profile.body)} />
                <small>{slot === 'dia' ? '☀️ Día' : `🌙 Noche${d.dress_code === 'gala' ? ' · Gala' : ''}`}</small>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
