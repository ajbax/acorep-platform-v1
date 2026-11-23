import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n';
import { IconTile } from './ui';

/**
 * Step-by-step form frame (Pic'KG's Post wizard): header with icon tile and step counter, a
 * segmented progress bar, the step content sliding in, and a footer pinned to the bottom.
 */
export function WizardFrame({
  icon,
  eyebrow,
  title,
  steps,
  index,
  exitTo,
  children,
  footer,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  steps: { key: string; label: string }[];
  index: number;
  exitTo: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { t, f } = useI18n();
  const step = steps[index]!;
  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-6">
      <header className="flex items-center gap-3.5">
        <IconTile icon={icon} size="lg" tone="bg-sun text-ink" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
          <h1 className="font-display text-[26px] font-extrabold leading-tight lg:text-[34px]">{title}</h1>
        </div>
        <Link
          to={exitTo}
          aria-label={t.wizard.exit}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink-soft transition-colors hover:bg-line hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      <p className="mt-5 text-sm font-semibold text-ink-soft">
        {f(t.wizard.stepOf, { n: index + 1, total: steps.length })} · <span className="text-ink">{step.label}</span>
      </p>
      <ol className="mt-2.5 flex gap-1.5" aria-label={title}>
        {steps.map((s, i) => (
          <li key={s.key} className="flex-1" aria-current={i === index ? 'step' : undefined}>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
              <motion.div
                className="h-full rounded-full bg-ink"
                initial={false}
                animate={{ width: i <= index ? '100%' : '0%' }}
                transition={{ duration: 0.35 }}
              />
            </div>
            <span
              className={`mt-1.5 hidden text-[11px] font-bold sm:block ${i === index ? 'text-ink' : 'text-zinc-400'}`}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      {/* Keyed so each step slides in; slide only, never hidden. */}
      <motion.div
        key={step.key}
        initial={{ x: 24 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="mt-8 space-y-10"
      >
        {children}
      </motion.div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/90 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">{footer}</div>
      </div>
    </div>
  );
}

/** Summary block on review steps, with a link back to the step that holds it. */
export function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-extrabold">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-line hover:text-ink"
        >
          {t.common.edit}
        </button>
      </div>
      <dl className="divide-y divide-line">{children}</dl>
    </section>
  );
}

export function ReviewRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,40%)_1fr] gap-3 py-2 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words font-semibold">{value || '—'}</dd>
    </div>
  );
}

/** Success screen after sending a wizard. */
export function WizardSuccess({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl pt-6 text-center lg:pt-14">
      <motion.span
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun text-ink shadow-lg shadow-sun/40"
      >
        <Icon className="h-10 w-10" strokeWidth={2.4} aria-hidden />
      </motion.span>
      <h1 className="mt-6 font-display text-[34px] font-extrabold leading-tight">{title}</h1>
      <p className="mt-2 text-ink-soft">{body}</p>
      <div className="mt-8 text-left">{children}</div>
    </div>
  );
}
