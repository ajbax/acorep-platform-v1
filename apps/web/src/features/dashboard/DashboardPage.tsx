import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import {
  DECLARATION_STATUSES,
  ESTABLISHMENT_KINDS,
  PROVINCE_CODES,
  PROVINCES,
  totalActive,
  type NationalStats,
  type ProvinceCode,
  type ProvinceStats,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import { Card, CardTitle, ErrorState, Kpi, Loading, PageHeader } from '@/components/ui';
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
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        actions={
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft ring-1 ring-line">
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
  const fmt = indicator === 'value' ? (v: number) => money(v, 'USD', true) : (v: number) => num(v);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t.dashboard.kpiActive} value={num(sum(totalActive))} />
        <Kpi label={t.dashboard.kpiPharmacies} value={num(sum((s) => s.active.PHARMACY))} />
        <Kpi
          label={t.dashboard.kpiPending}
          value={num(stats.pendingDeclarations)}
          tone={stats.pendingDeclarations ? 'warn' : undefined}
        />
        <Kpi
          label={t.dashboard.kpiValue}
          value={money(
            sum((s) => s.importValueUsd),
            'USD',
            true,
          )}
        />
        <Kpi
          label={t.dashboard.kpiNonCompliant}
          value={num(stats.nonCompliant)}
          tone={stats.nonCompliant ? 'danger' : undefined}
        />
        <Kpi
          label={t.dashboard.kpiExpired}
          value={num(sum((s) => s.expiredLicences))}
          tone={sum((s) => s.expiredLicences) ? 'danger' : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>{t.dashboard.mapTitle}</CardTitle>
          <div className="p-4 sm:p-5">
            <div role="radiogroup" aria-label={t.dashboard.indicator} className="mb-4 flex flex-wrap gap-2">
              {INDICATORS.map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={indicator === i}
                  onClick={() => setIndicator(i)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                    indicator === i ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-line hover:text-ink'
                  }`}
                >
                  {t.dashboard.indicators[i]}
                </button>
              ))}
            </div>
            <DrcMap
              values={values}
              format={fmt}
              label={t.dashboard.indicators[indicator].toLowerCase()}
              selected={selected}
              onSelect={setSelected}
            />
            <p className="mt-3 text-[11px] text-ink-soft">{t.dashboard.attribution}</p>
          </div>
        </Card>

        {selected ? (
          <ProvincePanel stats={stats.provinces[selected]} onClose={() => setSelected(null)} />
        ) : (
          <Card>
            <CardTitle>{t.dashboard.ranking}</CardTitle>
            <p className="px-5 pt-3 text-xs text-ink-soft">{t.dashboard.clickProvince}</p>
            <ol className="divide-y divide-line px-2 py-2">
              {[...PROVINCES]
                .sort((a, b) => values[b.code] - values[a.code])
                .slice(0, 12)
                .map((p, i) => {
                  const max = Math.max(1, ...Object.values(values));
                  return (
                    <li key={p.code}>
                      <button
                        type="button"
                        onClick={() => setSelected(p.code)}
                        className="grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
                      >
                        <span className="text-xs tabular-nums text-ink-soft">{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.name}</span>
                          <span className="mt-1 block h-1.5 rounded-full bg-surface">
                            <span
                              className="block h-1.5 rounded-full bg-accent"
                              style={{ width: `${(values[p.code] / max) * 100}%` }}
                            />
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums">{fmt(values[p.code])}</span>
                      </button>
                    </li>
                  );
                })}
            </ol>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>{t.dashboard.byMode}</CardTitle>
          <div className="grid grid-cols-2 gap-4 p-5">
            {(['SEA', 'AIR'] as const).map((m) => (
              <div key={m} className="rounded-lg bg-surface p-4">
                <p className={`text-xs font-semibold uppercase tracking-wide ${m === 'SEA' ? 'text-sea' : 'text-air'}`}>
                  {t.modes[m]}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{num(sum((s) => s.imports[m]))}</p>
                <p className="text-xs text-ink-soft">{t.dashboard.indicators.imports.toLowerCase()}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle
            aside={
              <Link
                to="/declarations"
                className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                {t.dashboard.viewDeclarations}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          >
            {t.dashboard.queue}
          </CardTitle>
          <ul className="space-y-2.5 p-5">
            {DECLARATION_STATUSES.filter((s) => s !== 'DRAFT').map((s) => {
              const n = stats.byStatus[s] ?? 0;
              const max = Math.max(1, ...Object.values(stats.byStatus).map((v) => v ?? 0));
              return (
                <li key={s} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="truncate text-ink-soft">{t.declaration.statuses[s]}</span>
                  <span className="h-2 rounded-full bg-surface">
                    <span
                      className={`block h-2 rounded-full ${BAR[DECLARATION_TONE[s]]}`}
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{num(n)}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function ProvincePanel({ stats, onClose }: { stats: ProvinceStats; onClose: () => void }) {
  const { t, f, num, money } = useI18n();
  const p = PROVINCES.find((x) => x.code === stats.province)!;
  return (
    <Card>
      <CardTitle
        aside={
          <button type="button" onClick={onClose} className="text-xs font-semibold text-accent hover:underline">
            {t.nav.close}
          </button>
        }
      >
        {p.name}
      </CardTitle>
      <div className="space-y-5 p-5">
        <p className="text-sm text-ink-soft">{f(t.dashboard.provinceCapital, { city: p.capital })}</p>
        <dl className="grid grid-cols-2 gap-3">
          {ESTABLISHMENT_KINDS.map((k) => (
            <div key={k} className="rounded-lg bg-surface p-3">
              <dt className="text-xs text-ink-soft">{t.establishment.kinds[k]}</dt>
              <dd className="text-lg font-bold tabular-nums">{num(stats.active[k])}</dd>
            </div>
          ))}
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-ink-soft">{t.dashboard.pendingEst}</dt>
            <dd className="text-lg font-bold tabular-nums">{num(stats.pendingEstablishments)}</dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-ink-soft">{t.dashboard.kpiExpired}</dt>
            <dd className={`text-lg font-bold tabular-nums ${stats.expiredLicences ? 'text-danger' : ''}`}>
              {num(stats.expiredLicences)}
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-ink-soft">
              {t.dashboard.indicators.imports} ({t.common.sea.toLowerCase()} / {t.common.air.toLowerCase()})
            </dt>
            <dd className="text-lg font-bold tabular-nums">
              {num(stats.imports.SEA)} / {num(stats.imports.AIR)}
            </dd>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <dt className="text-xs text-ink-soft">{t.dashboard.indicators.value}</dt>
            <dd className="text-lg font-bold tabular-nums">{money(stats.importValueUsd, 'USD', true)}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to={`/etablissements?province=${p.code}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90"
          >
            {t.dashboard.viewEstablishments}
          </Link>
          <Link
            to={`/declarations?province=${p.code}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface"
          >
            {t.dashboard.viewDeclarations}
          </Link>
        </div>
      </div>
    </Card>
  );
}
