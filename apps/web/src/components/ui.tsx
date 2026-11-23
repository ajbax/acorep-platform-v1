import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { animate } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ChevronDown, Plane, Ship, type LucideIcon } from 'lucide-react';
import type { TransportMode } from '@acorep/shared';
import { TONE_CLASS, type Tone } from '@/lib/statusTone';
import { useI18n } from '@/i18n';

/**
 * Counts from the previous value to the new one. The first render shows the final value
 * immediately, so content never depends on an animation running.
 */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration: 0.45,
      ease: 'easeOut',
      onUpdate: setShown,
      onComplete: () => setShown(value),
    });
    return () => controls.stop();
  }, [value]);
  return <span className="tabular-nums">{format(shown)}</span>;
}

const AVATAR_TONES = ['bg-sky-700', 'bg-amber-700', 'bg-emerald-700', 'bg-rose-700', 'bg-violet-700', 'bg-indigo-700'];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const dims = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-xs', lg: 'h-16 w-16 text-xl' }[size];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${tone} ${dims}`} aria-hidden>
      {initials}
    </span>
  );
}

/** ACOREP mark (placeholder until the official logo): a pharmacy cross crossed by the flag's yellow stripe. */
export function Mark({ className = 'h-8 w-8', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const bg = tone === 'dark' ? '#13264a' : '#ffffff';
  const fg = tone === 'dark' ? '#ffffff' : '#0b1a33';
  return (
    <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden>
      <rect width="64" height="64" rx="16" fill={bg} />
      <path d="M27 13h10v14h14v10H37v14H27V37H13V27h14z" fill={fg} />
      <path d="M12 52 52 12" stroke="#f7d618" strokeWidth="5" strokeLinecap="round" />
      <path d="M12 52 52 12" stroke="#ce1021" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Small coloured label above a section heading. */
export function Eyebrow({ children, tone = 'text-accent' }: { children: ReactNode; tone?: string }) {
  return (
    <div className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </div>
  );
}

/** Headline with its accent word on a yellow marker stroke (light backgrounds) or in yellow (dark). */
export function HeroHeading({
  lead,
  accent,
  dark = false,
  className = '',
  as: Tag = 'h1',
}: {
  lead: string;
  accent?: string;
  dark?: boolean;
  className?: string;
  as?: 'h1' | 'h2';
}) {
  return (
    <Tag className={`font-display font-extrabold ${className}`}>
      {lead}
      {accent && (
        <>
          {' '}
          <span className={dark ? 'text-sun' : 'highlight'}>{accent}</span>
        </>
      )}
    </Tag>
  );
}

export function PageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  back,
  actions,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  subtitle?: ReactNode;
  back?: string;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-3xl">
        {back && (
          <Link
            to={back}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-surface py-1.5 pl-2.5 pr-3.5 text-xs font-bold text-ink-soft transition-colors hover:bg-line hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t.common.back}
          </Link>
        )}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <HeroHeading
          lead={title}
          accent={accent}
          className="text-[32px] leading-[1.05] sm:text-[44px] lg:text-[52px]"
        />
        {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-white shadow-card ${className}`}>{children}</section>;
}

export function CardTitle({
  children,
  aside,
  icon: Icon,
}: {
  children: ReactNode;
  aside?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-5">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-extrabold">
        {Icon && <Icon className="h-[18px] w-[18px] text-ink-soft" strokeWidth={2.2} aria-hidden />}
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

/** Soft-tinted icon tile (Pic'KG's ModeTile pattern). */
export function IconTile({
  icon: Icon,
  tone = 'bg-surface text-ink',
  size = 'md',
}: {
  icon: LucideIcon;
  tone?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' }[size];
  const icon = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }[size];
  return (
    <span className={`grid shrink-0 place-items-center ${tone} ${dims}`}>
      <Icon className={icon} strokeWidth={2.2} aria-hidden />
    </span>
  );
}

export const MODE_STYLE: Record<TransportMode, { icon: LucideIcon; tile: string; text: string }> = {
  SEA: { icon: Ship, tile: 'bg-sea-soft text-sea', text: 'text-sea' },
  AIR: { icon: Plane, tile: 'bg-air-soft text-air', text: 'text-air' },
};

export function ModeTile({ mode, size = 'md' }: { mode: TransportMode; size?: 'sm' | 'md' | 'lg' }) {
  return <IconTile icon={MODE_STYLE[mode].icon} tone={MODE_STYLE[mode].tile} size={size} />;
}

export function Kpi({
  label,
  value,
  format,
  icon,
  tone = 'bg-surface text-ink',
  alert,
  to,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  icon: LucideIcon;
  tone?: string;
  /** Colours the figure when it needs attention. */
  alert?: 'warn' | 'danger';
  to?: string;
}) {
  const color = alert === 'danger' ? 'text-danger' : alert === 'warn' ? 'text-warn' : 'text-ink';
  const body = (
    <>
      <IconTile icon={icon} tone={tone} size="sm" />
      <p className={`mt-4 font-display text-[30px] font-extrabold leading-none ${color}`}>
        <AnimatedNumber value={value} format={format} />
      </p>
      <p className="mt-1.5 text-xs font-semibold text-ink-soft">{label}</p>
    </>
  );
  const cls = 'block rounded-3xl border border-line bg-white p-5 shadow-card';
  return to ? (
    <Link to={to} className={`${cls} transition-shadow hover:shadow-lift`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Definition list row for detail pages. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(110px,38%)_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-ink">{children}</dd>
    </div>
  );
}

/** Compact select for filter bars. */
export function Select({
  label,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
      {label}
      <span className="relative">
        <select
          {...rest}
          className="h-12 w-full cursor-pointer appearance-none rounded-2xl border-2 border-transparent bg-surface pl-4 pr-10 text-sm font-semibold normal-case tracking-normal text-ink outline-none transition-colors focus:border-ink focus:bg-white focus-visible:outline-none"
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
      </span>
    </label>
  );
}

/** Skeleton shown while data loads (no spinner). */
export function Loading({ rows = 4 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t.app.loading} className="space-y-3">
      <div className="shimmer h-24 rounded-3xl" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="shimmer h-16 rounded-2xl" />
      ))}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const { t } = useI18n();
  const code = error instanceof Error ? error.message : '';
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-3xl border border-red-200 bg-danger-soft p-5 text-sm font-semibold text-danger"
    >
      <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
      {t.apiErrors[code] ?? t.app.error}
    </div>
  );
}

export function Empty({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-sm text-ink-soft">
      {Icon && <IconTile icon={Icon} size="lg" tone="bg-surface text-ink-soft" />}
      {children}
    </div>
  );
}

const BTN = {
  primary:
    'bg-ink text-white shadow-lg shadow-ink/15 hover:bg-[#13264a] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none',
  sun: 'bg-sun text-ink hover:bg-[#fae04a]',
  ghost: 'bg-white text-ink ring-1 ring-inset ring-line hover:bg-surface',
  danger: 'bg-white text-danger ring-1 ring-inset ring-red-200 hover:bg-danger-soft',
};

/** Link styled as a button. */
export function ButtonLink({
  to,
  children,
  variant = 'primary',
  className = '',
}: {
  to: string;
  children: ReactNode;
  variant?: keyof typeof BTN;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-colors ${BTN[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export const buttonClass = (variant: keyof typeof BTN = 'primary') =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-colors ${BTN[variant]}`;
