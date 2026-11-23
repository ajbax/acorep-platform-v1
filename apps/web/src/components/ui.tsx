import type { ReactNode, SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Loader2 } from 'lucide-react';
import { TONE_CLASS, type Tone } from '@/lib/statusTone';
import { useI18n } from '@/i18n';

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            to={back}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t.common.back}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white shadow-card ${className}`}>{children}</section>;
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {aside}
    </div>
  );
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  const accent = tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}

/** Definition list row for detail pages. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(120px,40%)_1fr] gap-3 py-2 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink">{children}</dd>
    </div>
  );
}

export function Select({
  label,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-ink-soft">
      {label}
      <select
        {...rest}
        className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus-visible:border-accent"
      >
        {children}
      </select>
    </label>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-ink-soft">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {t.app.loading}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const { t } = useI18n();
  const code = error instanceof Error ? error.message : '';
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-xl border border-red-200 bg-danger-soft p-4 text-sm text-danger"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      {t.apiErrors[code] ?? t.app.error}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-ink-soft">{children}</p>;
}
