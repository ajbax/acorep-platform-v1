import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import {
  effectiveEstablishmentStatus,
  ESTABLISHMENT_KINDS,
  ESTABLISHMENT_STATUSES,
  isProvinceCode,
  provinceName,
  PROVINCES,
  type Establishment,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import { Badge, Card, Empty, ErrorState, Loading, PageHeader, Select } from '@/components/ui';
import { ESTABLISHMENT_TONE } from '@/lib/statusTone';
import { useSession } from '@/features/auth/AuthProvider';

const PAGE = 50;
const STATUS_FILTERS = [...ESTABLISHMENT_STATUSES.filter((s) => s !== 'DRAFT'), 'EXPIRED'] as const;

export function EstablishmentsPage() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['establishments'], queryFn: () => data.listEstablishments() });
  return (
    <>
      <PageHeader title={t.establishment.title} subtitle={t.establishment.subtitle} />
      {q.isPending ? <Loading /> : q.isError ? <ErrorState error={q.error} /> : <List items={q.data} />}
    </>
  );
}

function List({ items }: { items: Establishment[] }) {
  const { t, f } = useI18n();
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE);
  const province = params.get('province') ?? '';
  const kind = params.get('kind') ?? '';
  const status = params.get('status') ?? '';
  const text = params.get('q') ?? '';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLimit(PAGE);
  };

  const now = useMemo(() => new Date(), []);
  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return items
      .map((e) => ({ e, status: effectiveEstablishmentStatus(e, now) }))
      .filter(({ e }) => !province || !isProvinceCode(province) || e.province === province)
      .filter(({ e }) => !kind || e.kind === kind)
      .filter(({ status: s }) => !status || s === status)
      .filter(
        ({ e }) =>
          !needle ||
          [e.legalName, e.tradeName ?? '', e.rccm, e.licence?.number ?? '', e.city, e.commune ?? ''].some((v) =>
            v.toLowerCase().includes(needle),
          ),
      )
      .sort((a, b) => a.e.legalName.localeCompare(b.e.legalName, 'fr'));
  }, [items, province, kind, status, text, now]);

  // Provincial officers only see one province; the filter would be noise.
  const showProvince = session.role !== 'PROVINCIAL_OFFICER';

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
              placeholder={t.establishment.searchPlaceholder}
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink focus-visible:border-accent"
            />
          </span>
        </label>
        {showProvince && (
          <Select label={t.common.province} value={province} onChange={(e) => set('province', e.target.value)}>
            <option value="">{t.common.allProvinces}</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        <Select label={t.common.kind} value={kind} onChange={(e) => set('kind', e.target.value)}>
          <option value="">{t.common.all}</option>
          {ESTABLISHMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.establishment.kinds[k]}
            </option>
          ))}
        </Select>
        <Select label={t.common.status} value={status} onChange={(e) => set('status', e.target.value)}>
          <option value="">{t.common.all}</option>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {t.establishment.statuses[s]}
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
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-soft">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">{t.establishment.legalName}</th>
                  <th className="px-3 py-3 font-medium">{t.common.kind}</th>
                  <th className="px-3 py-3 font-medium">{t.common.province}</th>
                  <th className="px-3 py-3 font-medium">{t.establishment.licenceNumber}</th>
                  <th className="px-5 py-3 font-medium">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, limit).map(({ e, status: s }) => (
                  <tr key={e.id} className="hover:bg-surface">
                    <td className="max-w-80 px-5 py-3">
                      <Link
                        to={`/etablissements/${e.id}`}
                        className="block truncate font-semibold text-accent hover:underline"
                      >
                        {e.legalName}
                      </Link>
                      <span className="block truncate text-xs text-ink-soft">
                        {e.commune ? `${e.commune}, ` : ''}
                        {e.city}
                      </span>
                    </td>
                    <td className="px-3 py-3">{t.establishment.kinds[e.kind]}</td>
                    <td className="px-3 py-3">{provinceName(e.province)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{e.licence?.number ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={ESTABLISHMENT_TONE[s]}>{t.establishment.statuses[s]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {filtered.slice(0, limit).map(({ e, status: s }) => (
              <li key={e.id}>
                <Link to={`/etablissements/${e.id}`} className="block space-y-1 px-4 py-3 hover:bg-surface">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-accent">{e.legalName}</span>
                    <Badge tone={ESTABLISHMENT_TONE[s]}>{t.establishment.statuses[s]}</Badge>
                  </div>
                  <p className="text-xs text-ink-soft">
                    {t.establishment.kinds[e.kind]} · {e.city}, {provinceName(e.province)}
                  </p>
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
