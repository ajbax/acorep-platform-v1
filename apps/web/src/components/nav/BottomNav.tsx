import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, CircleUserRound, Map, Plus, Ship, Store } from 'lucide-react';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { isActivePath, useAttention, useNavGroups, type GroupKey } from './groups';

const ICONS: Partial<Record<GroupKey, typeof Map>> = {
  dashboard: Map,
  declarations: Ship,
  establishments: Building2,
  mine: Store,
  account: CircleUserRound,
};

/**
 * Phone/tablet tab bar (ported from Pic'KG): a detached ink-glass pill floating 12px above the
 * bottom edge, with the main action as a raised yellow button. Hidden on desktop, where the top
 * bar carries the navigation.
 */
export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { groups, cta } = useNavGroups();
  const attention = useAttention();
  const tabs = groups.filter((g) => g.key !== cta?.key);
  // The raised button sits in the middle.
  const half = Math.ceil(tabs.length / 2);

  const side = (g: (typeof groups)[number]) => {
    const active = isActivePath(pathname, g.to) && !(cta && isActivePath(pathname, cta.to));
    const Icon = ICONS[g.key] ?? Map;
    const badge = attention[g.key] ?? 0;
    return (
      <NavLink
        key={g.key}
        to={g.to}
        end={g.to === '/'}
        onClick={() => haptic()}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
          active ? 'text-white' : 'text-white/50 hover:text-white/80'
        }`}
      >
        {active && (
          <motion.span
            layoutId="nav-indicator"
            className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-white/10"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          />
        )}
        <span className="relative">
          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
          {badge > 0 && (
            <span className="absolute -right-2.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-ink">
              {badge}
            </span>
          )}
        </span>
        <span className="relative max-w-full truncate px-1">{g.short ?? g.label}</span>
      </NavLink>
    );
  };

  return (
    <nav
      aria-label={t.nav.tabs}
      className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-30 mx-auto max-w-md lg:hidden"
    >
      <div className="relative flex items-end rounded-[24px] bg-ink/90 px-1 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.5)] ring-1 ring-white/10 backdrop-blur-xl backdrop-saturate-150">
        {tabs.slice(0, half).map(side)}
        {cta && (
          <NavLink
            to={cta.to}
            onClick={() => haptic()}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-2.5 text-[11px] font-semibold ${
              isActivePath(pathname, cta.to) ? 'text-white' : 'text-white/50'
            }`}
          >
            <motion.span
              whileTap={{ scale: 0.9 }}
              className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-sun text-ink shadow-lg shadow-black/30 ring-4 ring-white"
            >
              <Plus className="h-7 w-7" strokeWidth={2.8} aria-hidden />
            </motion.span>
            {cta.short ?? cta.label}
          </NavLink>
        )}
        {tabs.slice(half).map(side)}
      </div>
    </nav>
  );
}
