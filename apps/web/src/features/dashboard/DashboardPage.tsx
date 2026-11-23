import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Banknote, Building2, CalendarX2, Hourglass, Pill, ShieldAlert, X } from 'lucide-react';
import {
  DECLARATION_STATUSES,
  ESTABLISHMENT_KINDS,
  PROVINCE_CODES,
  PROVINCES,
  totalActive,
  TRANSPORT_MODES,
  type NationalStats,
  type ProvinceCode,
  type ProvinceStats,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import {
  AnimatedNumber,
  ButtonLink,
  Card,
  CardTitle,
  ErrorState,
  Kpi,
  Loading,
  ModeTile,
  PageHeader,
} from '@/components/ui';
import { KIND_ICON } from '@/components/nav/NavPreview';
import { DECLARATION_TONE, type Tone } from '@/lib/statusTone';
import { DrcMap } from '@/features/map/DrcMap';

type Indicator = 'pharmacies' | 'establishments' | 'imports' | 'value';
const INDICATORS: Indicator[] = ['pharmacies', 'establishments', 'imports', 'value'];

const measure: Record<Indicator, (s: ProvinceStats) => number> = {
  pharmacies: (s) => s.active.PHARMACY,
  establishments: totalActive,
  imports: (s) => s.imports.SEA + s.imports.AIR,
  value: (s) => s.importValueUsd,
};

const BAR: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-info',
  warn: 'bg-warn',
  ok: 'bg-ok',
  danger: 'bg-danger',
};

export function DashboardPage() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['stats'], queryFn: () => data.nationalStats() });
  return (
    <>
      <PageHeader
        eyebrow={t.dashboard.eyebrow}
        title={t.dashboard.titleLead}
        accent={t.dashboard.titleAccent}
        subtitle={t.dashboard.subtitle}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink-soft shadow-card">
            <span className="h-2 w-2 rounded-full bg-ok" />
            {t.dashboard.period}
          </span>
        }
      />
      {q.isPending ? <Loading /> : q.isError ? <ErrorState error={q.error} /> : <Dashboard stats={q.data} />}
    </>
  );
}

function Dashboard({ stats }: { stats: NationalStats }) {
  const { t, num, money } = useI18n();
  const [indicator, setIndicator] = useState<Indicator>('pharmacies');
  const [selected, setSelected] = useState<ProvinceCode | null>(null);

  const all = Object.values(stats.provinces);
  const sum = (fn: (s: ProvinceStats) => number) => all.reduce((a, s) => a + fn(s), 0);
  const values = useMemo(
    () =>
      Object.fromEntries(PROVINCE_CODES.map((p) => [p, measure[indicator](stats.provinces[p])])) as Record<
        ProvinceCode,
        number
      >,
    [stats, indicator],
  );
  const fmt = indicator === 'value' ? (v: number) => money(v, 'USD', true) : (v: number) => num(Math.round(v));
  const expired = sum((s) => s.expiredLicences);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label={t.dashboard.kpiActive}
          value={sum(totalActive)}
          format={(n) => num(Math.round(n))}
          icon={Building2}
          tone="bg-accent-soft text-accent"
        />
        <Kpi
          label={t.dashboard.kpiPharmacies}
          value={sum((s) => s.active.PHARMACY)}
          format={(n) => num(Math.round(n))}
          icon={Pill}
          tone="bg-ok-soft text-ok"
        />
        <Kpi
          label={t.dashboard.kpiPending}
          value={stats.pendingDeclarations}
          format={(n) => num(Math.round(n))}
          icon={Hourglass}
          tone="bg-warn-soft text-warn"
          alert={stats.pendingDeclarations ? 'warn' : undefined}
          to="/declarations?status=SUBMITTED"
        />
        <Kpi
          label={t.dashboard.kpiValue}
          value={sum((s) => s.importValueUsd)}
          format={(n) => money(n, 'USD', true)}
          icon={Banknote}
          tone="bg-sun-soft text-sun-deep"
        />
        <Kpi
          label={t.dashboard.kpiNonCompliant}
          value={stats.nonCompliant}
          format={(n) => num(Math.round(n))}
          icon={ShieldAlert}
          tone="bg-danger-soft text-danger"
          alert={stats.nonCompliant ? 'danger' : undefined}
          to="/declarations?status=NON_COMPLIANT"
        />
        <Kpi
          label={t.dashboard.kpiExpired}
          value={expired}
          format={(n) => num(Math.round(n))}
          icon={CalendarX2}
          tone="bg-danger-soft text-danger"
          alert={expired ? 'danger' : undefined}
          to="/etablissements?status=EXPIRED"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6">
          <h2 className="font-display text-2xl font-extrabold">{t.dashboard.mapTitle}</h2>
          <div
            role="radiogroup"
            aria-label={t.dashboard.indicator}
            className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-surface p-1"
          >
            {INDICATORS.map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={indicator === i}
                onClick={() => {
                  haptic();
                  setIndicator(i);
                }}
                className={`relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                  indicator === i ? 'text-white' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {indicator === i && (
                  <motion.span
                    layoutId="indicator-pill"
                    className="absolute inset-0 rounded-xl bg-ink"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative whitespace-nowrap">{t.dashboard.indicators[i]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <DrcMap
              values={values}
              format={fmt}
              label={t.dashboard.indicators[indicator].toLowerCase()}
              selected={selected}
              onSelect={setSelected}
            />
            <p className="mt-3 text-[11px] text-ink-soft">{t.dashboard.attribution}</p>
          </div>
          {selected ? (
            <ProvincePanel stats={stats.provinces[selected]} onClose={() => setSelected(null)} />
          ) : (
            <Ranking values={values} fmt={fmt} onSelect={setSelected} />
          )}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>{t.dashboard.byMode}</CardTitle>
          <div className="grid grid-cols-2 gap-3 p-6 pt-3">
            {TRANSPORT_MODES.map((m) => (
              <div key={m} className="rounded-2xl bg-surface p-5">
                <ModeTile mode={m} />
                <p className="mt-4 font-display text-4xl font-extrabold">
                  <AnimatedNumber value={sum((s) => s.imports[m])} format={(n) => num(Math.round(n))} />
                </p>
                <p className="mt-1 text-xs font-semibold text-ink-soft">
                  {t.modes[m]} · {t.dashboard.indicators.imports.toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle
            aside={
              <Link
                to="/declarations"
                className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
              >
                {t.common.seeAll}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          >
            {t.dashboard.queue}
          </CardTitle>
          <ul className="space-y-1 p-4 pt-2">
            {DECLARATION_STATUSES.filter((s) => s !== 'DRAFT').map((s) => {
              const n = stats.byStatus[s] ?? 0;
              const max = Math.max(1, ...Object.values(stats.byStatus).map((v) => v ?? 0));
              return (
                <li key={s}>
                  <Link
                    to={`/declarations?status=${s}`}
                    className="grid grid-cols-[9.5rem_1fr_2.5rem] items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-surface"
                  >
                    <span className="truncate font-medium text-ink-soft">{t.declaration.statuses[s]}</span>
                    <span className="h-2 rounded-full bg-surface">
                      <motion.span
                        className={`block h-2 rounded-full ${BAR[DECLARATION_TONE[s]]}`}
                        initial={false}
                        animate={{ width: `${(n / max) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-display font-extrabold tabular-nums">{num(n)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Ranking({
  values,
  fmt,
  onSelect,
}: {
  values: Record<ProvinceCode, number>;
  fmt: (v: number) => string;
  onSelect: (p: ProvinceCode) => void;
}) {
  const { t } = useI18n();
  const max = Math.max(1, ...Object.values(values));
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">{t.dashboard.ranking}</p>
      <p className="mt-1 text-sm text-ink-soft">{t.dashboard.clickProvince}</p>
      <ol className="mt-4 space-y-1">
        {[...PROVINCES]
          .sort((a, b) => values[b.code] - values[a.code])
          .slice(0, 10)
          .map((p, i) => (
            <li key={p.code}>
              <button
                type="button"
                onClick={() => {
                  haptic();
                  onSelect(p.code);
                }}
                className="grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-surface"
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i < 3 ? 'bg-sun text-ink' : 'bg-surface text-ink-soft'}`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-surface">
                    <motion.span
                      className="block h-1.5 rounded-full bg-ink"
                      initial={false}
                      animate={{ width: `${(values[p.code] / max) * 100}%` }}
                    />
                  </span>
                </span>
                <span className="font-display text-base font-extrabold tabular-nums">{fmt(values[p.code])}</span>
              </button>
            </li>
          ))}
      </ol>
    </div>
  );
}

function ProvincePanel({ stats, onClose }: { stats: ProvinceStats; onClose: () => void }) {
  const { t, f, num, money } = useI18n();
  const p = PROVINCES.find((x) => x.code === stats.province)!;
  return (
    <motion.div initial={{ x: 16 }} animate={{ x: 0 }} className="rounded-3xl bg-ink p-6 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-sun">{p.code}</p>
          <h3 className="mt-1 font-display text-3xl font-extrabold">{p.name}</h3>
          <p className="text-sm text-white/60">{f(t.dashboard.provinceCapital, { city: p.capital })}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.nav.close}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-2">
        {ESTABLISHMENT_KINDS.map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <div key={k} className="rounded-2xl bg-white/[0.06] p-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
                <Icon className="h-3.5 w-3.5 text-sun" aria-hidden />
                {t.establishment.kinds[k]}
              </dt>
              <dd className="mt-1 font-display text-2xl font-extrabold">{num(stats.active[k])}</dd>
            </div>
          );
        })}
        <div className="rounded-2xl bg-white/[0.06] p-3">
          <dt className="text-[11px] font-semibold text-white/60">{t.dashboard.pendingEst}</dt>
          <dd className="mt-1 font-display text-2xl font-extrabold">{num(stats.pendingEstablishments)}</dd>
        </div>
      </dl>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/[0.06] p-3">
          <dt className="text-[11px] font-semibold text-white/60">{t.dashboard.kpiExpired}</dt>
          <dd className={`mt-1 font-display text-xl font-extrabold ${stats.expiredLicences ? 'text-red-300' : ''}`}>
            {num(stats.expiredLicences)}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.06] p-3">
          <dt className="text-[11px] font-semibold text-white/60">
            {t.common.sea} / {t.common.air}
          </dt>
          <dd className="mt-1 font-display text-xl font-extrabold">
            {num(stats.imports.SEA)} / {num(stats.imports.AIR)}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.06] p-3">
          <dt className="text-[11px] font-semibold text-white/60">{t.common.value}</dt>
          <dd className="mt-1 font-display text-xl font-extrabold">{money(stats.importValueUsd, 'USD', true)}</dd>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <ButtonLink to={`/etablissements?province=${p.code}`} variant="sun" className="flex-1">
          {t.dashboard.viewEstablishments}
        </ButtonLink>
        <Link
          to={`/declarations?province=${p.code}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-5 text-sm font-bold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10"
        >
          {t.dashboard.viewDeclarations}
        </Link>
      </div>
    </motion.div>
  );
}
