import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Fingerprint, MapPin, Plus, Ship, UserRound } from 'lucide-react';
import {
  allowedNext,
  declareError,
  effectiveEstablishmentStatus,
  ESTABLISHMENT_TRANSITIONS,
  establishmentActor,
  IMPORTING_KINDS,
  provinceName,
  type Establishment,
  type EstablishmentStatus,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import { Badge, ButtonLink, Card, CardTitle, ErrorState, Field, Loading, ModeTile, PageHeader } from '@/components/ui';
import { History, StatusActions } from '@/components/workflow';
import { KIND_ICON } from '@/components/nav/NavPreview';
import { DECLARATION_TONE, ESTABLISHMENT_TONE } from '@/lib/statusTone';
import { useSession } from '@/features/auth/AuthProvider';

export function EstablishmentPage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['establishment', id], queryFn: () => data.getEstablishment(id) });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorState error={q.error} />;
  return <Detail e={q.data} />;
}

function Detail({ e }: { e: Establishment }) {
  const { t, date } = useI18n();
  const session = useSession();
  const qc = useQueryClient();
  const status = effectiveEstablishmentStatus(e);
  const actor = establishmentActor(session, e);
  const options = actor ? allowedNext(ESTABLISHMENT_TRANSITIONS, actor, e.status) : [];
  const move = useMutation({
    mutationFn: ({ to, comment }: { to: EstablishmentStatus; comment: string }) =>
      data.moveEstablishment(e.id, { to, expected: e.status, comment }),
    onSuccess: (next) => {
      qc.setQueryData(['establishment', e.id], next);
      void qc.invalidateQueries({ queryKey: ['establishments'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
  const hidden = <span className="font-normal italic text-ink-soft">{t.establishment.hidden}</span>;
  const importer = IMPORTING_KINDS.includes(e.kind);
  const canDeclare = session.role === 'OPERATOR' && !declareError(session, e);
  const KindIcon = KIND_ICON[e.kind];
  const pending = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(e.status);

  return (
    <>
      <PageHeader
        back={session.role === 'OPERATOR' ? undefined : '/etablissements'}
        eyebrow={t.establishment.kinds[e.kind]}
        title={e.legalName}
        subtitle={`${e.commune ? `${e.commune}, ` : ''}${e.city} · ${provinceName(e.province)}`}
        actions={
          <>
            <Badge tone={ESTABLISHMENT_TONE[status]}>{t.establishment.statuses[status]}</Badge>
            {canDeclare && (
              <ButtonLink to="/declarations/nouvelle" variant="sun">
                <Plus className="h-4 w-4" strokeWidth={2.8} aria-hidden />
                {t.nav.declareCta}
              </ButtonLink>
            )}
          </>
        }
      />

      {/* Operators following their file: where it stands. */}
      {session.role === 'OPERATOR' && pending && (
        <section className="mb-6 rounded-3xl bg-ink p-6 text-white">
          <p className="font-display text-xl font-extrabold">{t.register.nextTitle}</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {t.register.next.map((n, i) => (
              <li key={n} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 text-sm font-semibold">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? 'bg-sun text-ink' : 'bg-white/10 text-white/60'}`}
                >
                  {i + 1}
                </span>
                {n}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-6">
          {/* Licence card */}
          <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-7">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(60%_90%_at_100%_0%,rgb(247_214_24/0.16),transparent_60%)]"
            />
            <div className="relative flex flex-wrap items-center gap-5">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sun text-ink">
                <KindIcon className="h-7 w-7" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">
                  {t.establishment.licence}
                </p>
                {e.licence ? (
                  <p className="font-mono text-xl font-bold">{e.licence.number}</p>
                ) : (
                  <p className="text-sm text-white/70">{t.establishment.noLicence}</p>
                )}
              </div>
              {e.licence && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-white/[0.07] px-4 py-2.5">
                    <p className="text-[11px] font-semibold text-white/55">{t.establishment.issuedAt}</p>
                    <p className="font-bold">{date(e.licence.issuedAt)}</p>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${status === 'EXPIRED' ? 'bg-red-500/25' : 'bg-white/[0.07]'}`}
                  >
                    <p className="text-[11px] font-semibold text-white/55">{t.establishment.expiresAt}</p>
                    <p className="font-bold">{date(e.licence.expiresAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardTitle icon={Fingerprint}>{t.establishment.identity}</CardTitle>
              <dl className="divide-y divide-line px-6 pb-4">
                <Field label={t.establishment.legalName}>{e.legalName}</Field>
                {e.tradeName && <Field label={t.establishment.tradeName}>{e.tradeName}</Field>}
                <Field label={t.establishment.rccm}>
                  <span className="font-mono">{e.rccm}</span>
                </Field>
                <Field label={t.establishment.idNat}>
                  <span className="font-mono">{e.idNat}</span>
                </Field>
                <Field label={t.establishment.nif}>
                  <span className="font-mono">{e.nif}</span>
                </Field>
                {e.gln && (
                  <Field label={t.establishment.gln}>
                    <span className="font-mono">{e.gln}</span>
                  </Field>
                )}
              </dl>
            </Card>
            <Card>
              <CardTitle icon={MapPin}>{t.establishment.location}</CardTitle>
              <dl className="divide-y divide-line px-6 pb-4">
                <Field label={t.common.province}>{provinceName(e.province)}</Field>
                <Field label={t.common.city}>{e.city}</Field>
                <Field label={t.establishment.address}>{e.address}</Field>
                {e.location && (
                  <Field label={t.establishment.gps}>
                    <span className="font-mono text-xs">
                      {e.location.lat.toFixed(5)}, {e.location.lon.toFixed(5)}
                    </span>
                  </Field>
                )}
              </dl>
            </Card>
            <Card className="xl:col-span-2">
              <CardTitle icon={UserRound}>{t.establishment.pharmacist}</CardTitle>
              <dl className="grid gap-x-8 px-6 pb-4 md:grid-cols-2">
                <Field label={t.register.pharmacistName}>{e.pharmacist.name}</Field>
                <Field label={t.establishment.orderNumber}>{e.pharmacist.orderNumber}</Field>
                <Field label={t.establishment.phone}>{e.pharmacist.phone || hidden}</Field>
                <Field label={t.establishment.contact}>{e.contact.phone || hidden}</Field>
              </dl>
            </Card>
          </div>
          {importer && <ImporterDeclarations establishmentId={e.id} />}
        </div>

        <div className="space-y-6">
          {actor === 'REVIEWER' && (
            <StatusActions
              key={e.status}
              options={options}
              label={(to) => t.establishment.moveTo[to]}
              pending={move.isPending}
              error={move.error?.message}
              onMove={(to, comment) => move.mutate({ to, comment })}
            />
          )}
          <History events={e.history} label={(s) => t.establishment.statuses[s]} />
        </div>
      </div>
    </>
  );
}

function ImporterDeclarations({ establishmentId }: { establishmentId: string }) {
  const { t, date } = useI18n();
  const q = useQuery({ queryKey: ['declarations'], queryFn: () => data.listDeclarations() });
  const mine = (q.data ?? [])
    .filter((d) => d.importerId === establishmentId)
    .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt))
    .slice(0, 6);
  if (!mine.length) return null;
  return (
    <Card>
      <CardTitle
        icon={Ship}
        aside={
          <Link to="/declarations" className="text-xs font-bold text-accent hover:underline">
            {t.common.seeAll}
          </Link>
        }
      >
        {t.establishment.declarations}
      </CardTitle>
      <ul className="divide-y divide-line px-2 pb-2">
        {mine.map((d) => (
          <li key={d.id}>
            <Link
              to={`/declarations/${d.id}`}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-surface"
            >
              <ModeTile mode={d.mode} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{d.reference}</span>
                <span className="block text-xs text-ink-soft">{date(d.submittedAt ?? d.updatedAt)}</span>
              </span>
              <Badge tone={DECLARATION_TONE[d.status]}>{t.declaration.statuses[d.status]}</Badge>
              <ChevronRight className="h-4 w-4 text-ink-soft" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
