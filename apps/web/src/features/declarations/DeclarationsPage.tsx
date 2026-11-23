import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, PackageSearch, Plus, Search } from 'lucide-react';
import {
  DECLARATION_STATUSES,
  declarationValue,
  IMPORTING_KINDS,
  isProvinceCode,
  provinceName,
  PROVINCES,
  TRANSPORT_MODES,
  type ImportDeclaration,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import {
  Badge,
  ButtonLink,
  Card,
  Empty,
  ErrorState,
  Loading,
  MODE_STYLE,
  ModeTile,
  PageHeader,
  Select,
} from '@/components/ui';
import { DECLARATION_TONE } from '@/lib/statusTone';
import { useSession } from '@/features/auth/AuthProvider';
import { useMyEstablishment } from '@/components/nav/groups';

const PAGE = 50;

export function DeclarationsPage() {
  const { t } = useI18n();
  const session = useSession();
  const mine = useMyEstablishment(session);
  const q = useQuery({ queryKey: ['declarations'], queryFn: () => data.listDeclarations() });
  const canDeclare = !!mine.data && IMPORTING_KINDS.includes(mine.data.kind);
  return (
    <>
      <PageHeader
        eyebrow={t.declaration.eyebrow}
        title={t.declaration.titleLead}
        accent={t.declaration.titleAccent}
        subtitle={t.declaration.subtitle}
        actions={
          canDeclare && (
            <ButtonLink to="/declarations/nouvelle" variant="sun">
              <Plus className="h-4 w-4" strokeWidth={2.8} aria-hidden />
              {t.nav.declareCta}
            </ButtonLink>
          )
        }
      />
      {q.isPending ? <Loading /> : q.isError ? <ErrorState error={q.error} /> : <List items={q.data} />}
    </>
  );
}

const searchInput =
  'h-12 w-full rounded-2xl border-2 border-transparent bg-surface pl-11 pr-4 text-sm font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-zinc-400 focus:border-ink focus:bg-white focus-visible:outline-none';

function List({ items }: { items: ImportDeclaration[] }) {
  const { t, f, date, money } = useI18n();
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE);
  const province = params.get('province') ?? '';
  const status = params.get('status') ?? '';
  const mode = params.get('mode') ?? '';
  const text = params.get('q') ?? '';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLimit(PAGE);
  };

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return items
      .filter((d) => !province || !isProvinceCode(province) || d.destinationProvince === province)
      .filter((d) => !status || d.status === status)
      .filter((d) => !mode || d.mode === mode)
      .filter(
        (d) =>
          !needle ||
          [d.reference, d.importerName, d.transportDocument, ...d.lines.flatMap((l) => [l.productName, l.inn])].some(
            (v) => v.toLowerCase().includes(needle),
          ),
      )
      .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt));
  }, [items, province, status, mode, text]);

  return (
    <Card>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft sm:col-span-2 lg:col-span-1">
          {t.common.search}
          <span className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
              aria-hidden
            />
            <input
              type="search"
              value={text}
              onChange={(e) => set('q', e.target.value)}
              placeholder={t.declaration.searchPlaceholder}
              className={searchInput}
            />
          </span>
        </label>
        {session.role !== 'OPERATOR' && (
          <Select label={t.common.province} value={province} onChange={(e) => set('province', e.target.value)}>
            <option value="">{t.common.allProvinces}</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        <Select label={t.common.status} value={status} onChange={(e) => set('status', e.target.value)}>
          <option value="">{t.common.all}</option>
          {DECLARATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.declaration.statuses[s]}
            </option>
          ))}
        </Select>
        <Select label={t.declaration.mode} value={mode} onChange={(e) => set('mode', e.target.value)}>
          <option value="">{t.common.all}</option>
          {TRANSPORT_MODES.map((m) => (
            <option key={m} value={m}>
              {t.modes[m]}
            </option>
          ))}
        </Select>
      </div>

      <p className="border-t border-line px-5 py-3 text-xs font-semibold text-ink-soft" aria-live="polite">
        {f(t.common.results, { n: filtered.length })}
      </p>

      {!filtered.length ? (
        <Empty icon={PackageSearch}>{t.common.noResults}</Empty>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-bold">{t.common.reference}</th>
                  <th className="px-3 py-3 font-bold">{t.declaration.importer}</th>
                  <th className="px-3 py-3 font-bold">{t.declaration.submittedAt}</th>
                  <th className="px-3 py-3 text-right font-bold">{t.common.value}</th>
                  <th className="px-5 py-3 font-bold">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, limit).map((d) => (
                  <tr key={d.id} className="group transition-colors hover:bg-surface/60">
                    <td className="px-5 py-3.5">
                      <Link to={`/declarations/${d.id}`} className="flex items-center gap-3">
                        <ModeTile mode={d.mode} size="sm" />
                        <span>
                          <span className="block font-bold group-hover:text-accent">{d.reference}</span>
                          <span className={`block text-xs font-semibold ${MODE_STYLE[d.mode].text}`}>
                            {t.modes[d.mode]}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="max-w-64 px-3 py-3.5">
                      <span className="block truncate font-semibold">{d.importerName}</span>
                      <span className="block text-xs text-ink-soft">{provinceName(d.destinationProvince)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-ink-soft">
                      {d.submittedAt ? date(d.submittedAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-display font-extrabold tabular-nums">
                      {money(declarationValue(d), d.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={DECLARATION_TONE[d.status]}>{t.declaration.statuses[d.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {filtered.slice(0, limit).map((d) => (
              <li key={d.id}>
                <Link to={`/declarations/${d.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-surface">
                  <ModeTile mode={d.mode} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{d.reference}</span>
                      <span className="font-display text-sm font-extrabold">
                        {money(declarationValue(d), d.currency)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-ink-soft">{d.importerName}</p>
                    <Badge tone={DECLARATION_TONE[d.status]}>{t.declaration.statuses[d.status]}</Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <div className="border-t border-line p-4 text-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="rounded-full bg-surface px-5 py-2.5 text-sm font-bold text-ink hover:bg-line"
              >
                + {Math.min(PAGE, filtered.length - limit)}
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
