import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  allowedNext,
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
import { Badge, Card, CardTitle, ErrorState, Field, Loading, PageHeader } from '@/components/ui';
import { History, StatusActions } from '@/components/workflow';
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

  return (
    <>
      <PageHeader
        back={session.role === 'OPERATOR' ? undefined : '/etablissements'}
        title={e.legalName}
        subtitle={`${t.establishment.kinds[e.kind]} · ${e.city}, ${provinceName(e.province)}`}
        actions={<Badge tone={ESTABLISHMENT_TONE[status]}>{t.establishment.statuses[status]}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardTitle>{t.establishment.identity}</CardTitle>
              <dl className="px-5 py-3">
                <Field label={t.establishment.legalName}>{e.legalName}</Field>
                {e.tradeName && <Field label={t.establishment.tradeName}>{e.tradeName}</Field>}
                <Field label={t.common.kind}>{t.establishment.kinds[e.kind]}</Field>
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
              <CardTitle>{t.establishment.licence}</CardTitle>
              <dl className="px-5 py-3">
                {e.licence ? (
                  <>
                    <Field label={t.establishment.licenceNumber}>
                      <span className="font-mono">{e.licence.number}</span>
                    </Field>
                    <Field label={t.establishment.issuedAt}>{date(e.licence.issuedAt)}</Field>
                    <Field label={t.establishment.expiresAt}>
                      <span className={status === 'EXPIRED' ? 'text-danger' : ''}>{date(e.licence.expiresAt)}</span>
                    </Field>
                  </>
                ) : (
                  <p className="py-2 text-sm text-ink-soft">{t.establishment.noLicence}</p>
                )}
              </dl>
            </Card>
            <Card>
              <CardTitle>{t.establishment.location}</CardTitle>
              <dl className="px-5 py-3">
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
            <Card>
              <CardTitle>{t.establishment.pharmacist}</CardTitle>
              <dl className="px-5 py-3">
                <Field label={t.establishment.pharmacist}>{e.pharmacist.name}</Field>
                <Field label={t.establishment.orderNumber}>{e.pharmacist.orderNumber}</Field>
                <Field label={t.establishment.phone}>{e.pharmacist.phone || hidden}</Field>
                <Field label={t.establishment.contact}>{e.contact.phone || hidden}</Field>
              </dl>
            </Card>
          </div>
          {importer && <ImporterDeclarations establishmentId={e.id} />}
        </div>

        <div className="space-y-6">
          {actor && (
            <StatusActions
              // Remount after each decision so the confirmation form closes.
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
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
    .slice(0, 8);
  if (!mine.length) return null;
  return (
    <Card>
      <CardTitle>{t.establishment.declarations}</CardTitle>
      <ul className="divide-y divide-line">
        {mine.map((d) => (
          <li key={d.id}>
            <Link
              to={`/declarations/${d.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-surface"
            >
              <span>
                <span className="font-semibold text-accent">{d.reference}</span>
                <span className="ml-2 text-xs text-ink-soft">{d.submittedAt && date(d.submittedAt)}</span>
              </span>
              <Badge tone={DECLARATION_TONE[d.status]}>{t.declaration.statuses[d.status]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
