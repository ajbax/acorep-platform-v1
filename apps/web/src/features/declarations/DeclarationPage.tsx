import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import {
  allowedNext,
  DECLARATION_TRANSITIONS,
  declarationActor,
  declarationValue,
  entryPoint,
  MIN_SHELF_LIFE_MONTHS,
  provinceName,
  shortShelfLife,
  type DeclarationStatus,
  type ImportDeclaration,
} from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import { Badge, Card, CardTitle, ErrorState, Field, Loading, PageHeader } from '@/components/ui';
import { History, StatusActions } from '@/components/workflow';
import { DECLARATION_TONE } from '@/lib/statusTone';
import { useSession } from '@/features/auth/AuthProvider';
import { ModeLabel } from './DeclarationsPage';

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
  const options = actor ? allowedNext(DECLARATION_TRANSITIONS, actor, d.status) : [];
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

  return (
    <>
      <PageHeader
        back="/declarations"
        title={d.reference}
        subtitle={d.importerName}
        actions={<Badge tone={DECLARATION_TONE[d.status]}>{t.declaration.statuses[d.status]}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardTitle>{t.declaration.shipment}</CardTitle>
            <dl className="grid gap-x-8 px-5 py-3 md:grid-cols-2">
              <Field label={t.declaration.mode}>
                <ModeLabel mode={d.mode} />
              </Field>
              <Field label={t.declaration.entryPoint}>{entryPoint(d.entryPoint).name}</Field>
              <Field label={d.mode === 'SEA' ? t.declaration.transportDocSEA : t.declaration.transportDocAIR}>
                <span className="font-mono">{d.transportDocument}</span>
              </Field>
              <Field label={t.declaration.carrier}>{d.carrier}</Field>
              <Field label={t.declaration.shipmentCountry}>{country(d.shipmentCountry)}</Field>
              <Field label={t.declaration.supplier}>{d.supplier}</Field>
              <Field label={t.declaration.expectedArrival}>{date(d.expectedArrival)}</Field>
              <Field label={t.declaration.destination}>{provinceName(d.destinationProvince)}</Field>
              {d.submittedAt && <Field label={t.declaration.submittedAt}>{date(d.submittedAt)}</Field>}
              <Field label={t.declaration.total}>{money(declarationValue(d), d.currency)}</Field>
            </dl>
          </Card>

          <Card>
            <CardTitle
              aside={<span className="text-xs text-ink-soft">{f(t.declaration.lines, { n: d.lines.length })}</span>}
            >
              {t.declaration.products}
            </CardTitle>
            {flagged > 0 && (
              <p className="mx-5 mt-4 flex items-start gap-2 rounded-lg bg-warn-soft p-3 text-sm text-warn">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {f(t.declaration.shortShelfLife, { months: MIN_SHELF_LIFE_MONTHS })} ({flagged})
              </p>
            )}
            <ul className="divide-y divide-line">
              {d.lines.map((l, i) => {
                const short = shortShelfLife(l, d.expectedArrival);
                return (
                  <li key={i} className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">
                        {l.productName} <span className="font-normal text-ink-soft">· {l.strength}</span>
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {money(l.quantity * l.unitPrice, d.currency)}
                      </p>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
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
          {actor && (
            <StatusActions
              // Remount after each decision so the confirmation form closes.
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
        className={`truncate font-medium ${mono ? 'font-mono' : ''} ${warn ? 'text-warn' : 'text-ink'}`}
        title={warn ?? value}
      >
        {warn && <AlertTriangle className="mr-1 inline size-3" aria-label={warn} />}
        {value}
      </dd>
    </div>
  );
}
