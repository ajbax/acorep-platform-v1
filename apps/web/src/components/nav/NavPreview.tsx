import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Factory, Pill, ShieldCheck, Store, Truck, Warehouse } from 'lucide-react';
import {
  effectiveEstablishmentStatus,
  ESTABLISHMENT_KINDS,
  PENDING_STATUSES,
  PROVINCES,
  provinceName,
  totalActive,
  type EstablishmentKind,
} from '@acorep/shared';
import { useI18n } from '@/i18n';
import { data } from '@/services';
import { useSession } from '@/features/auth/AuthProvider';
import { Avatar, ModeTile } from '@/components/ui';
import { useMyEstablishment, type GroupKey } from './groups';

/** Icons per kind of establishment, shared with the registration wizard. */
export const KIND_ICON: Record<EstablishmentKind, typeof Store> = {
  IMPORTER: Truck,
  WHOLESALER: Warehouse,
  MANUFACTURER: Factory,
  PHARMACY: Pill,
  DEPOT: Store,
};

/** Live mini view of a section, shown in the desktop menu panel. Uses the same cached queries as the pages. */
export function NavPreview({ k }: { k: GroupKey }) {
  if (k === 'dashboard') return <DashboardPreview />;
  if (k === 'declarations') return <DeclarationsPreview />;
  if (k === 'establishments') return <EstablishmentsPreview />;
  if (k === 'register') return <RegisterPreview />;
  if (k === 'declare') return <DeclarePreview />;
  if (k === 'mine') return <MinePreview />;
  return <AccountPreview />;
}

function Big({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="font-display text-6xl font-extrabold leading-none text-white">{value}</div>
      <div className="mt-2 text-sm font-semibold text-white/60">{label}</div>
    </div>
  );
}

function DashboardPreview() {
  const { t, num } = useI18n();
  const q = useQuery({ queryKey: ['stats'], queryFn: () => data.nationalStats() });
  if (!q.data) return null;
  const all = Object.values(q.data.provinces);
  const top = [...all].sort((a, b) => totalActive(b) - totalActive(a)).slice(0, 3);
  const max = Math.max(1, ...top.map(totalActive));
  return (
    <div className="space-y-6">
      <Big value={num(all.reduce((a, p) => a + totalActive(p), 0))} label={t.dashboard.kpiActive} />
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-white/50">{t.dashboard.ranking}</p>
        <ul className="space-y-2">
          {top.map((p) => (
            <li key={p.province} className="rounded-2xl bg-white/[0.05] p-3">
              <div className="flex items-center justify-between text-sm font-bold text-white">
                {provinceName(p.province)}
                <span className="font-display">{num(totalActive(p))}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-sun" style={{ width: `${(totalActive(p) / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeclarationsPreview() {
  const { t, f } = useI18n();
  const q = useQuery({ queryKey: ['declarations'], queryFn: () => data.listDeclarations() });
  const all = [...(q.data ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pending = all.filter((d) => PENDING_STATUSES.includes(d.status)).length;
  return (
    <div className="space-y-6">
      <Big value={pending} label={f(t.nav.preview.pending, { n: pending }).replace(/^\d+\s*/, '')} />
      <ul className="space-y-2">
        {all.slice(0, 3).map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-2.5 pr-4">
            <ModeTile mode={d.mode} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-bold text-white">{d.reference}</div>
              <div className="truncate text-xs text-white/55">{d.importerName}</div>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
              {t.declaration.statuses[d.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EstablishmentsPreview() {
  const { t, num } = useI18n();
  const q = useQuery({ queryKey: ['establishments'], queryFn: () => data.listEstablishments() });
  const all = q.data ?? [];
  const active = all.filter((e) => effectiveEstablishmentStatus(e) === 'ACTIVE');
  return (
    <div className="space-y-6">
      <Big value={num(active.length)} label={t.dashboard.kpiActive} />
      <div className="grid grid-cols-2 gap-2">
        {ESTABLISHMENT_KINDS.map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <div key={k} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.05] p-3">
              <Icon className="h-4 w-4 text-sun" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/70">
                {t.establishment.kinds[k]}
              </span>
              <span className="font-display text-sm font-extrabold text-white">
                {num(active.filter((e) => e.kind === k).length)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RegisterPreview() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <p className="font-display text-2xl font-extrabold leading-tight text-white">{t.register.title}</p>
      <p className="text-sm text-white/60">{t.nav.preview.registerBody}</p>
      <div className="grid gap-2">
        {(['PHARMACY', 'IMPORTER', 'DEPOT'] as const).map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <Link
              key={k}
              to={`/etablissements/nouveau?type=${k}`}
              className="group flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 transition-colors hover:bg-white/[0.09]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sun text-ink">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">{t.establishment.kinds[k]}</div>
                <div className="truncate text-xs text-white/55">{t.register.kindBody[k]}</div>
              </div>
              <ArrowRight
                className="h-4 w-4 text-white/50 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DeclarePreview() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <p className="font-display text-2xl font-extrabold leading-tight text-white">{t.declare.title}</p>
      <p className="text-sm text-white/60">{t.nav.preview.declareBody}</p>
      <ol className="space-y-2">
        {(['transport', 'origin', 'products', 'review'] as const).map((step, i) => (
          <li key={step} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs font-bold text-sun">
              {i + 1}
            </span>
            <span className="text-sm font-semibold text-white">{t.declare.steps[step]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MinePreview() {
  const { t } = useI18n();
  const session = useSession();
  const q = useMyEstablishment(session);
  if (!q.data) return null;
  const e = q.data;
  const status = effectiveEstablishmentStatus(e);
  const Icon = KIND_ICON[e.kind];
  return (
    <div className="space-y-5">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sun text-ink">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div>
        <p className="font-display text-2xl font-extrabold leading-tight text-white">{e.legalName}</p>
        <p className="mt-1 text-sm text-white/60">
          {t.establishment.kinds[e.kind]} · {e.city}, {provinceName(e.province)}
        </p>
      </div>
      <p className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
        {t.establishment.statuses[status]}
        {e.licence && ` · ${e.licence.number}`}
      </p>
    </div>
  );
}

function AccountPreview() {
  const { t } = useI18n();
  const session = useSession();
  const scope = session.province
    ? PROVINCES.find((p) => p.code === session.province)?.name
    : session.role === 'OPERATOR'
      ? undefined
      : t.account.national;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={session.name} size="lg" />
        <div className="min-w-0">
          <div className="truncate font-display text-2xl font-extrabold text-white">{session.name}</div>
          <div className="text-sm text-white/55">{t.roles[session.role]}</div>
        </div>
      </div>
      {scope && (
        <p className="text-sm text-white/70">
          {t.account.scope} : <span className="font-bold text-white">{scope}</span>
        </p>
      )}
      <div className="flex items-start gap-3 rounded-2xl bg-blue-500/15 p-4 text-blue-100">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" aria-hidden />
        <p className="text-sm font-semibold">{t.account.mfa}</p>
      </div>
    </div>
  );
}

/** Quick links under the preview, per section. */
export function PanelChildren({
  k,
  className,
  childClass,
  labelClass,
  metaClass,
}: {
  k: GroupKey;
  // CSS-module class names from the navbar.
  className?: string;
  childClass?: string;
  labelClass?: string;
  metaClass?: string;
}) {
  const { t } = useI18n();
  const session = useSession();
  const l = t.nav.links;
  const items: Record<GroupKey, { to: string; label: string; meta: string }[]> = {
    dashboard: [
      { to: '/declarations?status=SUBMITTED', label: l.submitted, meta: l.submittedMeta },
      { to: '/etablissements?status=UNDER_REVIEW', label: l.estReview, meta: l.estReviewMeta },
      { to: '/declarations?status=NON_COMPLIANT', label: l.nonCompliant, meta: l.nonCompliantMeta },
      { to: '/etablissements?status=EXPIRED', label: l.expired, meta: l.expiredMeta },
    ],
    declarations:
      session.role === 'OPERATOR'
        ? [
            { to: '/declarations?status=INFO_REQUESTED', label: l.infoRequested, meta: l.infoRequestedMeta },
            { to: '/declarations?status=DRAFT', label: l.drafts, meta: l.draftsMeta },
          ]
        : [
            { to: '/declarations?status=SUBMITTED', label: l.submitted, meta: l.submittedMeta },
            { to: '/declarations?status=APPROVED', label: l.approved, meta: l.approvedMeta },
            { to: '/declarations?mode=SEA', label: t.modes.SEA, meta: l.seaMeta },
            { to: '/declarations?mode=AIR', label: t.modes.AIR, meta: l.airMeta },
          ],
    establishments: [
      { to: '/etablissements?kind=PHARMACY', label: t.establishment.kinds.PHARMACY, meta: l.pharmaciesMeta },
      { to: '/etablissements?kind=IMPORTER', label: t.establishment.kinds.IMPORTER, meta: l.importersMeta },
      { to: '/etablissements?status=SUBMITTED', label: l.estSubmitted, meta: l.estSubmittedMeta },
      { to: '/etablissements?status=SUSPENDED', label: l.suspended, meta: l.suspendedMeta },
    ],
    register: [],
    declare: [],
    mine: [],
    account: [],
  };
  const list = items[k];
  if (list.length === 0) return null;
  return (
    <div key={`${k}-links`} className={className}>
      {list.map((c, i) => (
        <Link key={c.to} to={c.to} className={childClass} style={{ '--i': i } as CSSProperties}>
          <span className={labelClass}>{c.label}</span>
          <span className={metaClass}>{c.meta}</span>
        </Link>
      ))}
    </div>
  );
}
