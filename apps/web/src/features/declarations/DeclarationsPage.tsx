import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plane, Search, Ship } from 'lucide-react';
import {
  DECLARATION_STATUSES,
  declarationValue,
  isProvinceCode,
  PROVINCES,
  TRANSPORT_MODES,
  type ImportDeclaration,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import { Badge, Card, Empty, ErrorState, Loading, PageHeader, Select } from '@/components/ui';
import { DECLARATION_TONE } from '@/lib/statusTone';
import { useSession } from '@/features/auth/AuthProvider';

const PAGE = 50;

export function DeclarationsPage() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['declarations'], queryFn: () => data.listDeclarations() });
  return (
    <>
      <PageHeader title={t.declaration.title} subtitle={t.declaration.subtitle} />
      {q.isPending ? <Loading /> : q.isError ? <ErrorState error={q.error} /> : <List items={q.data} />}
    </>
  );
}

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
      .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  }, [items, province, status, mode, text]);

  return (
    <Card>
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          {t.common.search}
          <span className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
              aria-hidden
            />
            <input
              type="search"
              value={text}
              onChange={(e) => set('q', e.target.value)}
              placeholder={t.declaration.searchPlaceholder}
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink focus-visible:border-accent"
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

      <p className="px-5 pt-3 text-xs text-ink-soft" aria-live="polite">
        {f(t.common.results, { n: filtered.length })}
      </p>

      {!filtered.length ? (
        <Empty>{t.common.noResults}</Empty>
      ) : (
        <>
          {/* Table from md, cards below. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">{t.common.reference}</th>
                  <th className="px-3 py-3 font-medium">{t.declaration.importer}</th>
                  <th className="px-3 py-3 font-medium">{t.declaration.mode}</th>
                  <th className="px-3 py-3 font-medium">{t.declaration.submittedAt}</th>
                  <th className="px-3 py-3 text-right font-medium">{t.common.value}</th>
                  <th className="px-5 py-3 font-medium">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, limit).map((d) => (
                  <tr key={d.id} className="hover:bg-surface">
                    <td className="px-5 py-3">
                      <Link to={`/declarations/${d.id}`} className="font-semibold text-accent hover:underline">
                        {d.reference}
                      </Link>
                    </td>
                    <td className="max-w-64 truncate px-3 py-3">{d.importerName}</td>
                    <td className="px-3 py-3">
                      <ModeLabel mode={d.mode} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-soft">
                      {d.submittedAt ? date(d.submittedAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      {money(declarationValue(d), d.currency)}
                    </td>
                    <td className="px-5 py-3">
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
                <Link to={`/declarations/${d.id}`} className="block space-y-1.5 px-4 py-3 hover:bg-surface">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-accent">{d.reference}</span>
                    <Badge tone={DECLARATION_TONE[d.status]}>{t.declaration.statuses[d.status]}</Badge>
                  </div>
                  <p className="truncate text-sm">{d.importerName}</p>
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <ModeLabel mode={d.mode} />
                    <span className="tabular-nums">{money(declarationValue(d), d.currency)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <div className="border-t border-line p-4 text-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-accent ring-1 ring-line hover:bg-surface"
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

export function ModeLabel({ mode }: { mode: ImportDeclaration['mode'] }) {
  const { t } = useI18n();
  const Icon = mode === 'SEA' ? Ship : Plane;
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${mode === 'SEA' ? 'text-sea' : 'text-air'}`}>
      <Icon className="size-4" aria-hidden />
      {t.modes[mode]}
    </span>
  );
}
