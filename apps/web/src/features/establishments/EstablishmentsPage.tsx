import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus, Search, SearchX } from 'lucide-react';
import {
  canRegisterAny,
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
import { Badge, ButtonLink, Card, Empty, ErrorState, IconTile, Loading, PageHeader, Select } from '@/components/ui';
import { KIND_ICON } from '@/components/nav/NavPreview';
import { ESTABLISHMENT_TONE } from '@/lib/statusTone';
import { useSession } from '@/features/auth/AuthProvider';

const PAGE = 50;
const STATUS_FILTERS = [...ESTABLISHMENT_STATUSES.filter((s) => s !== 'DRAFT'), 'EXPIRED'] as const;
const KIND_TONE = 'bg-surface text-ink';

export function EstablishmentsPage() {
  const { t } = useI18n();
  const session = useSession();
  const q = useQuery({ queryKey: ['establishments'], queryFn: () => data.listEstablishments() });
  return (
    <>
      <PageHeader
        eyebrow={t.establishment.eyebrow}
        title={t.establishment.titleLead}
        accent={t.establishment.titleAccent}
        subtitle={t.establishment.subtitle}
        actions={
          canRegisterAny(session) && (
            <ButtonLink to="/etablissements/nouveau" variant="sun">
              <Plus className="h-4 w-4" strokeWidth={2.8} aria-hidden />
              {t.nav.registerCta}
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
      .sort((a, b) => b.e.updatedAt.localeCompare(a.e.updatedAt));
  }, [items, province, kind, status, text, now]);

  // Provincial officers only see one province; the filter would be noise.
  const showProvince = session.role !== 'PROVINCIAL_OFFICER';

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
              placeholder={t.establishment.searchPlaceholder}
              className={searchInput}
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

      <p className="border-t border-line px-5 py-3 text-xs font-semibold text-ink-soft" aria-live="polite">
        {f(t.common.results, { n: filtered.length })}
      </p>

      {!filtered.length ? (
        <Empty icon={SearchX}>{t.common.noResults}</Empty>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-bold">{t.establishment.legalName}</th>
                  <th className="px-3 py-3 font-bold">{t.common.province}</th>
                  <th className="px-3 py-3 font-bold">{t.establishment.licenceNumber}</th>
                  <th className="px-5 py-3 font-bold">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, limit).map(({ e, status: s }) => (
                  <tr key={e.id} className="group transition-colors hover:bg-surface/60">
                    <td className="max-w-96 px-5 py-3.5">
                      <Link to={`/etablissements/${e.id}`} className="flex items-center gap-3">
                        <IconTile icon={KIND_ICON[e.kind]} tone={KIND_TONE} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-bold group-hover:text-accent">{e.legalName}</span>
                          <span className="block truncate text-xs text-ink-soft">
                            {t.establishment.kinds[e.kind]} · {e.commune ? `${e.commune}, ` : ''}
                            {e.city}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 font-medium">{provinceName(e.province)}</td>
                    <td className="px-3 py-3.5 font-mono text-xs text-ink-soft">{e.licence?.number ?? '—'}</td>
                    <td className="px-5 py-3.5">
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
                <Link to={`/etablissements/${e.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-surface">
                  <IconTile icon={KIND_ICON[e.kind]} tone={KIND_TONE} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-bold">{e.legalName}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {t.establishment.kinds[e.kind]} · {e.city}, {provinceName(e.province)}
                    </p>
                    <Badge tone={ESTABLISHMENT_TONE[s]}>{t.establishment.statuses[s]}</Badge>
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
