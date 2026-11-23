import { BadgeCheck, Fingerprint, LockKeyhole } from 'lucide-react';
import { ENTRY_POINTS, PROVINCES } from '@acorep/shared';
import { useI18n } from '@/i18n';
import { HeroHeading, Mark } from '@/components/ui';
import { DRC_VIEWBOX, PROVINCE_SHAPES, project } from '@/features/map/drcShapes';

const REASSURANCE_ICONS = [Fingerprint, LockKeyhole, BadgeCheck];

/** The DRC drawn from the province shapes, with points of entry pulsing: brand illustration. */
function MapArt() {
  return (
    <svg viewBox={`-10 -10 ${DRC_VIEWBOX.width + 20} ${DRC_VIEWBOX.height + 20}`} className="h-full w-full" aria-hidden>
      {PROVINCES.map((p) => (
        <path
          key={p.code}
          d={PROVINCE_SHAPES[p.code].d}
          fill="rgb(255 255 255 / 0.04)"
          stroke="rgb(255 255 255 / 0.18)"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      ))}
      {PROVINCES.map((p) => {
        const { x, y } = project(p.lon, p.lat);
        return <circle key={p.code} cx={x} cy={y} r={3} fill="rgb(255 255 255 / 0.5)" />;
      })}
      {ENTRY_POINTS.map((e) => {
        const { x, y } = project(e.lon, e.lat);
        return (
          <g key={e.id}>
            <circle cx={x} cy={y} r={6} fill="none" stroke="#f7d618" strokeWidth={2} className="entry-pulse" />
            <circle cx={x} cy={y} r={6} fill="#f7d618" />
          </g>
        );
      })}
    </svg>
  );
}

/** Dark brand panel beside the sign-in forms (desktop only). */
export function AuthBrandPanel() {
  const { t } = useI18n();
  return (
    <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
      <div className="absolute -right-32 -top-10 h-[640px] w-[640px] opacity-70">
        <MapArt />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(70%_60%_at_0%_100%,rgb(0_98_204/0.35),transparent_60%),radial-gradient(60%_50%_at_100%_0%,rgb(247_214_24/0.12),transparent_60%)]"
      />
      <div className="relative flex items-center gap-3">
        <Mark className="h-10 w-10 rounded-xl ring-1 ring-white/15" />
        <div className="leading-tight">
          <p className="font-display text-xl font-extrabold tracking-wide">{t.app.name}</p>
          <p className="text-xs text-white/60">{t.app.fullName}</p>
        </div>
      </div>
      <div className="relative mt-auto max-w-lg">
        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-sun">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {t.signIn.eyebrow}
        </p>
        <HeroHeading
          lead={t.signIn.headLead}
          accent={t.signIn.headAccent}
          dark
          className="text-[52px] leading-[1.02]"
        />
        <p className="mt-5 max-w-md text-lg text-white/70">{t.signIn.lead}</p>
        <ul className="mt-10 grid gap-4">
          {t.signIn.reassurances.map((r, i) => {
            const Icon = REASSURANCE_ICONS[i]!;
            return (
              <li key={r.title} className="flex items-start gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] ring-1 ring-white/10">
                  <Icon className="h-5 w-5 text-sun" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-bold">{r.title}</span>
                  <span className="block text-sm text-white/60">{r.body}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
