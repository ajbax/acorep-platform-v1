import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { Avatar, Mark } from '@/components/ui';
import { AuthBrandPanel } from './AuthBrand';
import { useAuth } from './AuthProvider';
import { DEMO_PROFILES } from './session';

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
      <AuthBrandPanel />

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
