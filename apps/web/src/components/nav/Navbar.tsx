import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, LogOut, Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useIsDesktop } from '@/lib/useMediaQuery';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Avatar, Mark } from '@/components/ui';
import { groupForPath, isActivePath, useAttention, useNavGroups, type GroupKey, type NavGroup } from './groups';
import { NavPreview, PanelChildren } from './NavPreview';
import s from './nav.module.css';

type ScrollState = 'top' | 'up' | 'down';

/**
 * Scroll direction (with a dead zone) as React state, plus page progress written
 * straight to `--p` on the header, so there is no re-render per scroll frame.
 */
function useScroll(rootRef: RefObject<HTMLElement | null>, pctRef: RefObject<HTMLSpanElement | null>) {
  const [state, setState] = useState<ScrollState>('top');
  const last = useRef(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      rootRef.current?.style.setProperty('--p', p.toFixed(4));
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)} %`;
      const d = y - last.current;
      if (y < 24) setState('top');
      else if (d > 6) setState('down');
      else if (d < -6) setState('up');
      if (Math.abs(d) > 6 || y < 24) last.current = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [rootRef, pctRef]);
  return state;
}

function Burger({
  open,
  onClick,
  label,
  btnRef,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
  btnRef?: RefObject<HTMLButtonElement>;
}) {
  return (
    <button ref={btnRef} type="button" onClick={onClick} aria-expanded={open} aria-label={label} className={s.burger}>
      <span />
      <span />
    </button>
  );
}

/** Scroll gauge around the mark: the arc fills, the yellow node orbits. */
function ProgressRing() {
  return (
    <svg viewBox="0 0 24 24" className={s.ring} aria-hidden>
      <circle cx="12" cy="12" r="10.5" className={s.ringTrack} />
      <circle cx="12" cy="12" r="10.5" pathLength={100} className={s.ringFill} transform="rotate(-90 12 12)" />
      <circle cx="12" cy="1.5" r="2.6" className={s.ringNode} />
    </svg>
  );
}

/** Keeps `inert` in sync without relying on React knowing the attribute. */
function useInert(ref: RefObject<HTMLElement | null>, inert: boolean) {
  useEffect(() => {
    if (inert) ref.current?.setAttribute('inert', '');
    else ref.current?.removeAttribute('inert');
  }, [ref, inert]);
}

/**
 * Detached floating navbar (ported from Pic'KG). Writes `--nav-offset` on <html> (space taken
 * by the bar right now) so sticky elements can sit just below it, or at the top when the bar
 * hides on phones.
 */
export function Navbar() {
  const { t } = useI18n();
  const session = useSession();
  const { pathname } = useLocation();
  const desktop = useIsDesktop();
  const { groups, cta } = useNavGroups();
  const attention = useAttention();

  const rootRef = useRef<HTMLElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const state = useScroll(rootRef, pctRef);

  const [panelOpen, setPanelOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [active, setActive] = useState<GroupKey>(groups[0]!.key);
  const [expanded, setExpanded] = useState(false);
  const panelBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useInert(panelRef, !panelOpen);

  // Close the panel on navigation (state reset during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setPanelOpen(false);
  }

  const openPanel = () => {
    setActive(groupForPath(groups, pathname));
    setEverOpened(true);
    setPanelOpen(true);
  };
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    panelBtn.current?.focus();
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = panelOpen ? 'hidden' : '';
    if (!panelOpen) return;
    const id = setTimeout(() => closeBtn.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [panelOpen, closePanel]);

  // Space the bar occupies right now: hidden on phones while scrolling down.
  useEffect(() => {
    const hidden = !desktop && state === 'down';
    document.documentElement.style.setProperty('--nav-offset', hidden ? '0px' : '84px');
  }, [desktop, state]);

  useEffect(() => () => clearTimeout(collapseTimer.current), []);
  const expand = () => {
    clearTimeout(collapseTimer.current);
    setExpanded(true);
  };
  const scheduleCollapse = () => {
    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setExpanded(false), 350);
  };

  const pill = (g: NavGroup) => (
    <NavLink key={g.key} to={g.to} end={g.to === '/' || g.key === 'mine'} className={s.link}>
      {g.label}
      {(attention[g.key] ?? 0) > 0 && <span className={s.badge}>{attention[g.key]}</span>}
    </NavLink>
  );

  // Pills: everything except the call to action and the account, split around the logo.
  const pills = groups.filter((g) => g.key !== cta?.key && g.key !== 'account');
  const left = pills.slice(0, 2);
  const right = pills.slice(2);
  const activeGroup = groups.find((g) => g.key === active) ?? groups[0]!;
  const firstName = session.name.replace(/^Dr\.?\s+/, '').split(' ')[0];

  return (
    <>
      <div aria-hidden className={s.spacer} />

      <header ref={rootRef} className={s.root} data-state={state} data-expanded={expanded}>
        <div className={s.wrapper} onPointerEnter={expand} onPointerLeave={scheduleCollapse}>
          <div className={s.plate}>
            <span aria-hidden className={s.progress} />
          </div>

          <div className={s.bar}>
            <div className={`${s.side} ${s.left}`}>
              {desktop && <Burger btnRef={panelBtn} open={panelOpen} onClick={openPanel} label={t.nav.openMenu} />}
              <nav aria-label={t.nav.main} className="ml-auto hidden items-center lg:flex">
                {left.map(pill)}
              </nav>
            </div>

            <div className={s.center}>
              <Link to={groups[0]!.to} className={s.full} aria-label={t.nav.home}>
                <Mark className="h-8 w-8 rounded-lg ring-1 ring-white/15" />
                <span className={s.wordmark}>{t.app.name}</span>
                {/* The tag only fits beside the pills on very wide screens (and on phones, where there are none). */}
                <span aria-hidden className={`${s.divider} hidden sm:block lg:hidden min-[1600px]:block`} />
                <span className={`${s.tag} hidden sm:block lg:hidden min-[1600px]:block`}>{t.nav.tag}</span>
              </Link>
              {desktop && (
                <button
                  type="button"
                  className={s.seal}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  aria-label={t.nav.backToTop}
                  tabIndex={-1}
                >
                  <span className={s.sealMark}>
                    <ProgressRing />
                    <Mark className={s.sealTag} />
                  </span>
                  <span className={s.sealLabel}>{t.app.name}</span>
                  <span ref={pctRef} className={s.sealPct}>
                    0 %
                  </span>
                </button>
              )}
            </div>

            <div className={`${s.side} ${s.right}`}>
              <nav aria-label={t.nav.secondary} className="mr-auto hidden items-center lg:flex">
                {right.map(pill)}
              </nav>
              <Link to="/compte" className={s.me} aria-label={`${t.nav.account} · ${session.name}`}>
                <Avatar name={session.name} size="sm" />
                <span className="hidden max-w-28 truncate sm:inline lg:hidden xl:inline">{firstName}</span>
              </Link>
              {/* Desktop only: phones use the bottom bar's raised button. */}
              {desktop && cta && (
                <Link to={cta.to} className={s.cta}>
                  <Plus className="h-4 w-4" strokeWidth={2.8} aria-hidden />
                  {cta.key === 'declare' ? t.nav.declareCta : t.nav.registerCta}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ Desktop panel ═══ */}
      {desktop && (
        <div ref={panelRef} className={s.panelRoot} data-open={panelOpen}>
          <div className={s.scrim} onClick={closePanel} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label={t.nav.openMenu} className={s.panel}>
            <span aria-hidden className={s.scan} />
            <div className={s.content}>
              <div className={`${s.top} ${s.row}`} style={{ '--i': 0 } as CSSProperties}>
                <Burger btnRef={closeBtn} open onClick={closePanel} label={t.nav.closeMenu} />
                <Link to={groups[0]!.to} className="flex items-center gap-2.5" aria-label={t.nav.home}>
                  <Mark className="h-8 w-8 rounded-lg ring-1 ring-white/15" />
                  <span className={s.wordmark}>{t.app.name}</span>
                </Link>
              </div>

              <nav aria-label={t.nav.sections}>
                <ul className={s.primary}>
                  {groups.map((g, i) => (
                    <li key={g.key} className={s.row} style={{ '--i': i + 1 } as CSSProperties}>
                      <Link
                        to={g.to}
                        data-active={active === g.key}
                        aria-current={
                          groupForPath(groups, pathname) === g.key && isActivePath(pathname, g.to) ? 'page' : undefined
                        }
                        onPointerEnter={() => setActive(g.key)}
                        onFocus={() => setActive(g.key)}
                        className={s.primaryLink}
                      >
                        <span className={s.primaryIdx}>{String(i + 1).padStart(2, '0')}</span>
                        {g.label}
                        {(attention[g.key] ?? 0) > 0 && <span className={s.badge}>{attention[g.key]}</span>}
                        <span aria-hidden className={s.arrow}>
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <AccountRow index={groups.length + 1} />
            </div>

            <div className={s.previewCol}>
              <section className={s.previewCard} aria-live="polite">
                <div className={s.previewHead}>
                  <p className={s.eyebrow}>{activeGroup.label}</p>
                  <Link
                    to={activeGroup.to}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white"
                  >
                    {t.nav.open} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
                <div key={active} className={s.previewSwap}>
                  {everOpened && <NavPreview k={active} />}
                </div>
                <PanelChildren
                  k={active}
                  className={s.children}
                  childClass={s.child}
                  labelClass={s.childLabel}
                  metaClass={s.childMeta}
                />
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AccountRow({ index }: { index: number }) {
  const { t } = useI18n();
  const session = useSession();
  const { signOut } = useAuth();
  return (
    <div className={`${s.account} ${s.row}`} style={{ '--i': index } as CSSProperties}>
      <div className="flex items-center gap-3">
        <Avatar name={session.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{session.name}</p>
          <p className="truncate text-xs text-white/60">{t.roles[session.role]}</p>
        </div>
        <button type="button" onClick={signOut} className={`${s.ghostBtn} ml-auto shrink-0 whitespace-nowrap`}>
          <LogOut className="h-4 w-4" aria-hidden />
          {t.nav.signOut}
        </button>
      </div>
    </div>
  );
}
