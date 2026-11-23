import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { Navbar } from './nav/Navbar';
import { BottomNav } from './nav/BottomNav';
import { Mark } from './ui';

/**
 * Signed-in layout: floating navbar, page content, slim footer, and the phone tab bar.
 * `focused` (wizards) hides the tab bar so the wizard's own footer owns the bottom of the screen.
 */
export function Shell({ children, focused = false }: { children: ReactNode; focused?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:p-3 focus:font-bold"
      >
        {t.app.skipToContent}
      </a>
      <Navbar />
      <main
        id="main"
        className={`mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 ${focused ? 'pb-40' : 'pb-36 lg:pb-16'}`}
      >
        {children}
      </main>
      {!focused && <SiteFooter />}
      {!focused && <BottomNav />}
    </div>
  );
}

function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="hidden border-t border-line bg-surface/60 lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-8 py-6 text-xs text-ink-soft">
        <div className="flex items-center gap-3">
          <Mark className="h-7 w-7" />
          <span className="font-semibold text-ink">{t.app.fullName}</span>
        </div>
        <span className="rounded-full bg-sun-soft px-3 py-1 font-bold text-sun-deep">{t.app.demoBanner}</span>
      </div>
    </footer>
  );
}
