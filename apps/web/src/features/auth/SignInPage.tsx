import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { ENTRY_POINTS, PROVINCES } from '@acorep/shared';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { Avatar, HeroHeading, Mark } from '@/components/ui';
import { DRC_VIEWBOX, PROVINCE_SHAPES, project } from '@/features/map/drcShapes';
import { useAuth } from './AuthProvider';
import { DEMO_PROFILES } from './session';

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

export function SignInPage() {
  const { t } = useI18n();
  const { session, signIn } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  // Only same-site paths, never an absolute URL (open redirect).
  const raw = params.get('next') ?? '/';
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';

  if (session) return <Navigate to={next} replace />;

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* grid-cols-1 + min-w-0 on main: long truncated labels must not widen the column past the screen. */}
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

      <main className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Mark className="mb-8 h-14 w-14 lg:hidden" />
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {t.signIn.title}
          </p>
          <h1 className="font-display text-[34px] font-extrabold leading-tight">{t.app.platform}</h1>
          <p className="mt-2 text-ink-soft">{t.signIn.intro}</p>

          <ul className="mt-8 space-y-2.5">
            {DEMO_PROFILES.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    haptic();
                    signIn(p.session);
                    nav(p.session.role === 'OPERATOR' && next === '/' ? '/declarations' : next, { replace: true });
                  }}
                  className="group flex w-full items-center gap-3.5 rounded-2xl border-2 border-transparent bg-surface p-3.5 text-left transition-all hover:border-ink hover:bg-white hover:shadow-card"
                >
                  <Avatar name={p.session.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-ink">{t.roles[p.session.role]}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {p.session.name} · {t.signIn.profiles[p.id]}
                    </span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink-soft transition-colors group-hover:bg-ink group-hover:text-white">
                    <ArrowRight className="h-4 w-4" aria-label={t.signIn.as} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sun-soft px-4 py-3.5">
            <span className="text-sm font-semibold text-sun-deep">{t.signIn.newEstablishment}</span>
            <Link
              to="/inscription"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-[#13264a]"
            >
              {t.signIn.registerLink}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <p className="mt-6 flex items-start gap-2 text-xs text-ink-soft">
            <ShieldCheck className="h-4 w-4 shrink-0 text-ok" aria-hidden />
            {t.signIn.demoNote}
          </p>
        </div>
      </main>
    </div>
  );
}
