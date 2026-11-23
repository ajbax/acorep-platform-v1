import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, FilePenLine, MessageSquareWarning, Package } from 'lucide-react';
import {
  allowedNext,
  DECLARATION_TRANSITIONS,
  declarationActor,
  declarationValue,
  EDITABLE_STATUSES,
  entryPoint,
  MIN_SHELF_LIFE_MONTHS,
  provinceName,
  shortShelfLife,
  type DeclarationStatus,
  type ImportDeclaration,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import {
  Badge,
  ButtonLink,
  Card,
  CardTitle,
  ErrorState,
  Field,
  Loading,
  MODE_STYLE,
  PageHeader,
} from '@/components/ui';
import { History, StatusActions } from '@/components/workflow';
import { DECLARATION_TONE } from '@/lib/statusTone';
import { useSession } from '@/features/auth/AuthProvider';

export function DeclarationPage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['declaration', id], queryFn: () => data.getDeclaration(id) });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorState error={q.error} />;
  return <Detail d={q.data} />;
}

function Detail({ d }: { d: ImportDeclaration }) {
  const { t, f, date, money, country, num } = useI18n();
  const session = useSession();
  const qc = useQueryClient();
  const actor = declarationActor(session, d);
  // Submitting needs the attestation, so it happens in the wizard, not here.
  const options = actor ? allowedNext(DECLARATION_TRANSITIONS, actor, d.status).filter((s) => s !== 'SUBMITTED') : [];
  const editable = actor === 'IMPORTER' && EDITABLE_STATUSES.includes(d.status);
  // Reviewers and inspectors always see the panel (it says when nothing is possible); importers only when they can act.
  const showActions = actor !== null && (actor !== 'IMPORTER' || options.length > 0);
  const move = useMutation({
    mutationFn: ({ to, comment }: { to: DeclarationStatus; comment: string }) =>
      data.moveDeclaration(d.id, { to, expected: d.status, comment }),
    onSuccess: (next) => {
      qc.setQueryData(['declaration', d.id], next);
      void qc.invalidateQueries({ queryKey: ['declarations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
  const flagged = d.lines.filter((l) => shortShelfLife(l, d.expectedArrival)).length;
  const request =
    d.status === 'INFO_REQUESTED' ? [...d.history].reverse().find((h) => h.to === 'INFO_REQUESTED') : undefined;
  const ModeIcon = MODE_STYLE[d.mode].icon;
  const entry = entryPoint(d.entryPoint);

  return (
    <>
      <PageHeader
        back="/declarations"
        eyebrow={t.declaration.eyebrow}
        title={d.reference}
        subtitle={d.importerName}
        actions={
          <>
            <Badge tone={DECLARATION_TONE[d.status]}>{t.declaration.statuses[d.status]}</Badge>
            {editable && (
              <ButtonLink to={`/declarations/${d.id}/modifier`} variant="sun">
                <FilePenLine className="h-4 w-4" aria-hidden />
                {t.declare.continueEditing}
              </ButtonLink>
            )}
          </>
        }
      />

      {request?.comment && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl bg-warn-soft p-5 text-sm text-warn">
          <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">{t.declare.infoRequested}</p>
            <p className="mt-1 font-medium text-ink">{request.comment}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-6">
          {/* Route summary */}
          <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-7">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(247_214_24/0.14),transparent_60%),radial-gradient(60%_80%_at_0%_100%,rgb(0_98_204/0.3),transparent_60%)]"
            />
            <div className="relative grid items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">
                  {t.declaration.shipmentCountry}
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold">{country(d.shipmentCountry)}</p>
                <p className="text-sm text-white/60">{d.supplier}</p>
              </div>
              <div className="flex items-center gap-2 text-sun">
                <span className="hidden h-px w-10 bg-white/25 sm:block" />
                <span className="grid h-11 w-11 place-items-center rounded-full bg-sun text-ink">
                  <ModeIcon className="h-5 w-5" aria-hidden />
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">
                  {t.declaration.entryPoint}
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold">{entry.name.replace(/\s*\(.*\)$/, '')}</p>
                <p className="text-sm text-white/60">{provinceName(entry.province)}</p>
              </div>
            </div>
            <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [t.declaration.mode, t.modes[d.mode]],
                [t.declaration.expectedArrival, date(d.expectedArrival)],
                [t.declaration.destination, provinceName(d.destinationProvince)],
                [t.declaration.total, money(declarationValue(d), d.currency)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/[0.07] p-3">
                  <p className="text-[11px] font-semibold text-white/55">{label}</p>
                  <p className="mt-0.5 font-display text-base font-extrabold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <Card>
            <CardTitle>{t.declaration.shipment}</CardTitle>
            <dl className="grid gap-x-8 px-6 pb-4 md:grid-cols-2">
              <Field label={d.mode === 'SEA' ? t.declaration.transportDocSEA : t.declaration.transportDocAIR}>
                <span className="font-mono">{d.transportDocument}</span>
              </Field>
              <Field label={t.declaration.carrier}>{d.carrier}</Field>
              <Field label={t.declaration.supplier}>{d.supplier}</Field>
              {d.submittedAt && <Field label={t.declaration.submittedAt}>{date(d.submittedAt)}</Field>}
            </dl>
          </Card>

          <Card>
            <CardTitle
              icon={Package}
              aside={
                <span className="text-xs font-semibold text-ink-soft">
                  {f(t.declaration.lines, { n: d.lines.length })}
                </span>
              }
            >
              {t.declaration.products}
            </CardTitle>
            {flagged > 0 && (
              <p className="mx-6 mt-2 flex items-start gap-2 rounded-2xl bg-warn-soft p-3.5 text-sm font-semibold text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {f(t.declaration.shortShelfLife, { months: MIN_SHELF_LIFE_MONTHS })} ({flagged})
              </p>
            )}
            <ul className="divide-y divide-line">
              {d.lines.map((l, i) => {
                const short = shortShelfLife(l, d.expectedArrival);
                return (
                  <li key={i} className="px-6 py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-display text-lg font-extrabold">
                        {l.productName}{' '}
                        <span className="font-sans text-sm font-medium text-ink-soft">· {l.strength}</span>
                      </p>
                      <p className="font-display text-lg font-extrabold tabular-nums">
                        {money(l.quantity * l.unitPrice, d.currency)}
                      </p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                      <Mini label={t.declaration.inn} value={l.inn} />
                      <Mini label={t.declaration.form} value={t.declaration.dosageForms[l.dosageForm]} />
                      <Mini label={t.declaration.amm} value={l.ammNumber} mono />
                      <Mini label={t.declaration.hs} value={l.hsCode} mono />
                      <Mini
                        label={t.declaration.manufacturer}
                        value={`${l.manufacturer} (${country(l.originCountry)})`}
                      />
                      <Mini label={t.declaration.batch} value={l.batchNumber} mono />
                      <Mini
                        label={t.declaration.expiry}
                        value={date(l.expiryDate)}
                        warn={short ? f(t.declaration.shortShelfLife, { months: MIN_SHELF_LIFE_MONTHS }) : undefined}
                      />
                      <Mini label={t.declaration.quantity} value={`${num(l.quantity)} × ${l.unit}`} />
                      <Mini label={t.declaration.unitPrice} value={money(l.unitPrice, d.currency)} />
                    </dl>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {showActions && (
            <StatusActions
              key={d.status}
              options={options}
              label={(to) => t.declaration.moveTo[to]}
              pending={move.isPending}
              error={move.error?.message}
              onMove={(to, comment) => move.mutate({ to, comment })}
            />
          )}
          <History events={d.history} label={(s) => t.declaration.statuses[s]} />
        </div>
      </div>
    </>
  );
}

function Mini({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd
        className={`truncate font-semibold ${mono ? 'font-mono' : ''} ${warn ? 'text-warn' : 'text-ink'}`}
        title={warn ?? value}
      >
        {warn && <AlertTriangle className="mr-1 inline h-3 w-3" aria-label={warn} />}
        {value}
      </dd>
    </div>
  );
}
