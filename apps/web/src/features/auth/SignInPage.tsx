import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Shell';
import { useI18n } from '@/i18n';
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
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <Logo light />
        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-flag-yellow">{t.app.platform}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{t.app.fullName}</h1>
        </div>
        <div
          aria-hidden
          className="h-1 w-40 bg-[linear-gradient(90deg,#0062cc_0_40%,#f7d618_40%_48%,#ce1021_48%_60%,#f7d618_60%_68%,#0062cc_68%)]"
        />
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold">{t.signIn.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t.signIn.intro}</p>
          <ul className="mt-6 space-y-2.5">
            {DEMO_PROFILES.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    signIn(p.session);
                    nav(p.session.role === 'OPERATOR' && next === '/' ? '/declarations' : next, { replace: true });
                  }}
                  className="group flex w-full items-center gap-4 rounded-xl border border-line bg-white p-4 text-left shadow-card transition-colors hover:border-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{t.roles[p.session.role]}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {p.session.name} · {t.signIn.profiles[p.id]}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                    aria-label={t.signIn.as}
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-start gap-2 rounded-lg bg-accent-soft p-3 text-xs text-accent">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {t.signIn.demoNote}
          </p>
        </div>
      </main>
    </div>
  );
}
