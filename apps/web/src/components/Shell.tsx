import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, LogOut, Map, Menu, Ship, X } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { useI18n } from '@/i18n';

/** Placeholder mark until ACOREP provides its logo files (docs/brand/). */
export function Logo({ light = false }: { light?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="size-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill={light ? '#ffffff' : '#0c1f3f'} />
        <path d="M27 14h10v13h13v10H37v13H27V37H14V27h13z" fill={light ? '#0c1f3f' : '#ffffff'} />
        <path d="M14 50 50 14" stroke="#f7d618" strokeWidth="4" />
      </svg>
      <div className="leading-tight">
        <p className={`text-[15px] font-extrabold tracking-wide ${light ? 'text-white' : 'text-ink'}`}>{t.app.name}</p>
        <p className={`text-[11px] ${light ? 'text-blue-100/80' : 'text-ink-soft'}`}>{t.app.platform}</p>
      </div>
    </div>
  );
}

function useNavItems() {
  const s = useSession();
  const { t } = useI18n();
  if (s.role === 'OPERATOR') {
    return [
      { to: '/declarations', label: t.nav.declarations, icon: Ship },
      { to: `/etablissements/${s.establishmentId}`, label: t.nav.myEstablishment, icon: Building2 },
    ];
  }
  return [
    { to: '/', label: t.nav.dashboard, icon: Map, end: true },
    { to: '/declarations', label: t.nav.declarations, icon: Ship },
    { to: '/etablissements', label: t.nav.establishments, icon: Building2 },
  ];
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const items = useNavItems();
  return (
    <ul className="space-y-1">
      {items.map(({ to, label, icon: Icon, ...rest }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={'end' in rest}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/12 text-white' : 'text-blue-100/80 hover:bg-white/8 hover:text-white'
              }`
            }
          >
            <Icon className="size-4.5" aria-hidden />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function UserCard() {
  const s = useSession();
  const { signOut } = useAuth();
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-white/8 p-3">
      <p className="truncate text-sm font-semibold text-white">{s.name}</p>
      <p className="truncate text-xs text-blue-100/75">{t.roles[s.role]}</p>
      <button
        type="button"
        onClick={signOut}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 py-2 text-xs font-semibold text-white hover:bg-white/10"
      >
        <LogOut className="size-3.5" aria-hidden />
        {t.nav.signOut}
      </button>
    </div>
  );
}

/** DRC flag stripe, used as a thin institutional accent. */
const FlagStripe = () => (
  <div
    aria-hidden
    className="h-1 w-full bg-[linear-gradient(100deg,#0062cc_0_44%,#f7d618_44%_47%,#ce1021_47%_53%,#f7d618_53%_56%,#0062cc_56%)]"
  />
);

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-3"
      >
        {t.app.skipToContent}
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink lg:flex">
        <FlagStripe />
        <div className="flex flex-1 flex-col gap-8 p-5">
          <Logo light />
          <nav aria-label={t.nav.menu} className="flex-1">
            <NavList />
          </nav>
          <UserCard />
        </div>
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-30 bg-ink lg:hidden">
        <FlagStripe />
        <div className="flex items-center justify-between px-4 py-3">
          <Logo light />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t.nav.menu}
            aria-expanded={open}
            className="rounded-lg p-2 text-white hover:bg-white/10"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t.nav.menu}>
          <button
            type="button"
            aria-label={t.nav.close}
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col gap-6 bg-ink p-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.nav.close}
              className="self-end rounded-lg p-2 text-white hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
            <nav aria-label={t.nav.menu} className="flex-1">
              <NavList onNavigate={() => setOpen(false)} />
            </nav>
            <UserCard />
          </div>
        </div>
      )}

      <div className="border-b border-amber-200 bg-warn-soft px-4 py-2 text-center text-xs font-medium text-warn">
        {t.app.demoBanner}
      </div>
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
