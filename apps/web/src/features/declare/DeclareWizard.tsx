import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FilePenLine,
  Loader2,
  MessageSquareWarning,
  PackagePlus,
  Plus,
  Search,
  Ship,
  Trash2,
} from 'lucide-react';
import {
  CURRENCIES,
  DOSAGE_FORMS,
  ENTRY_POINTS,
  MIN_SHELF_LIFE_MONTHS,
  shortShelfLife,
  TRANSPORT_MODES,
  type ImportDeclaration,
  type ProductReference,
} from '@acorep/shared';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { data } from '@/services';
import {
  Checkbox,
  ChoiceCard,
  FormField,
  PrefixField,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  Segmented,
  StepSection,
  TextArea,
  TextField,
} from '@/components/form';
import { ReviewBlock, ReviewRow, WizardFrame, WizardSuccess } from '@/components/Wizard';
import { MODE_STYLE, buttonClass } from '@/components/ui';
import {
  DECLARE_STEPS,
  emptyLine,
  initialDeclarationDraft,
  lineFromRegister,
  lineTotal,
  validateDeclaration,
  type DeclarationDraft,
  type DeclareStep,
  type LineDraft,
} from './draft';

/** Common origin countries for medicines imported into the DRC (ISO 3166-1 alpha-2). */
const COUNTRIES = [
  'IN',
  'CN',
  'FR',
  'BE',
  'DE',
  'CH',
  'IT',
  'ES',
  'NL',
  'PT',
  'GB',
  'IE',
  'DK',
  'SE',
  'US',
  'CA',
  'BR',
  'TR',
  'AE',
  'EG',
  'MA',
  'TN',
  'KE',
  'UG',
  'TZ',
  'RW',
  'ZM',
  'ZA',
  'AO',
  'CG',
  'CM',
  'NG',
  'GH',
  'SN',
  'PK',
  'BD',
  'KR',
  'JP',
  'IL',
];

/** Create a declaration, or edit a draft / answer a request for information (`existing`). */
export function DeclareWizard({ existing }: { existing?: ImportDeclaration }) {
  const { t, f, money, country, date } = useI18n();
  const qc = useQueryClient();
  const answering = existing?.status === 'INFO_REQUESTED';
  const [draft, setDraft] = useState<DeclarationDraft>(() => initialDeclarationDraft(existing));
  const [stepIdx, setStepIdx] = useState(0);
  const [attempted, setAttempted] = useState<Set<DeclareStep>>(new Set());
  const [done, setDone] = useState<ImportDeclaration | null>(null);

  const step = DECLARE_STEPS[stepIdx]!;
  const isLast = stepIdx === DECLARE_STEPS.length - 1;
  const v = validateDeclaration(draft, { forSubmit: true, answering });
  const edit = (patch: Partial<DeclarationDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const errText = (code?: string) =>
    code ? ((t.declaration.errors as Record<string, string>)[code] ?? t.declaration.errors.required) : undefined;
  const err = (key: string) => (attempted.has(step) ? errText(v.errors[key]) : undefined);
  const total = draft.lines.reduce((a, l) => a + lineTotal(l), 0);
  const countryOptions = useMemo(
    () => COUNTRIES.map((c) => ({ value: c, label: country(c) })).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [country],
  );

  const save = useMutation({
    mutationFn: ({ submit }: { submit: boolean }) => {
      const opts = { submit, attested: draft.attest };
      if (!existing) return data.createDeclaration(v.input!, opts);
      return data.updateDeclaration(existing.id, v.input!, {
        ...opts,
        expected: existing.status,
        comment: draft.response,
      });
    },
    onSuccess: (d) => {
      haptic([10, 40, 20]);
      qc.setQueryData(['declaration', d.id], d);
      void qc.invalidateQueries({ queryKey: ['declarations'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      setDone(d);
      window.scrollTo({ top: 0 });
    },
  });

  const goTo = (i: number) => {
    setStepIdx(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goNext = () => {
    setAttempted((s) => new Set(s).add(step));
    if (v.stepHasErrors(step)) {
      haptic([20, 30, 20]);
      return;
    }
    if (isLast) {
      save.mutate({ submit: true });
      return;
    }
    haptic();
    goTo(stepIdx + 1);
  };
  // A draft only needs a valid declaration, not the attestation.
  const saveDraft = () => {
    const draftCheck = validateDeclaration(draft, { forSubmit: false, answering: false });
    if (!draftCheck.input) {
      setAttempted(new Set(DECLARE_STEPS));
      const first = DECLARE_STEPS.findIndex((s) => draftCheck.stepHasErrors(s));
      if (first >= 0) goTo(first);
      return;
    }
    save.mutate({ submit: false });
  };

  if (done) {
    const submitted = done.status === 'SUBMITTED';
    return (
      <WizardSuccess
        icon={submitted ? Check : FilePenLine}
        title={submitted ? t.declare.submittedTitle : t.declare.draftTitle}
        body={submitted ? t.declare.submittedBody : t.declare.draftBody}
      >
        <div className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-card">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl ${MODE_STYLE[done.mode].tile}`}>
            <Ship className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold">{done.reference}</p>
            <p className="text-sm text-ink-soft">
              {t.modes[done.mode]} · {f(t.declaration.lines, { n: done.lines.length })}
            </p>
          </div>
          <p className="font-display text-lg font-extrabold">{money(total, done.currency)}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to={`/declarations/${done.id}`} className={`${buttonClass('primary')} min-h-14 flex-1 text-base`}>
            {t.declare.view}
          </Link>
          <Link to="/declarations" className={`${buttonClass('ghost')} min-h-14 flex-1 text-base`}>
            {t.nav.declarations}
          </Link>
        </div>
      </WizardSuccess>
    );
  }

  const lastRequest = answering ? [...existing!.history].reverse().find((h) => h.to === 'INFO_REQUESTED') : undefined;
  const showFixHint = attempted.has(step) && v.stepHasErrors(step);

  return (
    <WizardFrame
      icon={PackagePlus}
      eyebrow={existing ? f(t.declare.editEyebrow, { ref: existing.reference }) : t.declare.eyebrow}
      title={existing ? t.declare.continueEditing : t.declare.title}
      steps={DECLARE_STEPS.map((s) => ({ key: s, label: t.declare.steps[s] }))}
      index={stepIdx}
      exitTo={existing ? `/declarations/${existing.id}` : '/declarations'}
      footer={
        <div className="space-y-2">
          {(showFixHint || save.isError) && (
            <p role="alert" className="text-center text-xs font-semibold text-red-700">
              {save.isError
                ? (t.apiErrors[save.error.message] ?? t.app.error)
                : step === 'review' && !draft.attest
                  ? t.wizard.attestRequired
                  : t.wizard.fixErrors}
            </p>
          )}
          {isLast && (
            <button
              type="button"
              onClick={saveDraft}
              disabled={save.isPending}
              className="w-full py-1 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              {t.declare.saveDraft}
            </button>
          )}
          <div className="flex items-center gap-3">
            {stepIdx > 0 && (
              <SecondaryButton onClick={() => goTo(stepIdx - 1)}>
                <ArrowLeft className="h-5 w-5" aria-hidden />
                <span className="sr-only">{t.wizard.previous}</span>
              </SecondaryButton>
            )}
            {draft.lines.length > 0 && !isLast && (
              <div className="hidden shrink-0 leading-tight sm:block">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t.declare.total}</div>
                <div className="font-display text-xl font-extrabold">{money(total, draft.currency)}</div>
              </div>
            )}
            <PrimaryButton onClick={goNext} disabled={save.isPending}>
              {save.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  {t.wizard.sending}
                </>
              ) : isLast ? (
                answering ? (
                  t.declare.resubmit
                ) : (
                  t.declare.submit
                )
              ) : (
                <>
                  {t.wizard.continue}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      {lastRequest?.comment && stepIdx === 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
          <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">{t.declare.infoRequested}</p>
            <p className="mt-1 font-medium text-ink">{lastRequest.comment}</p>
          </div>
        </div>
      )}

      {step === 'transport' && (
        <StepSection title={t.declare.transportTitle} body={t.declare.transportBody}>
          <Segmented
            label={t.declaration.mode}
            value={draft.mode}
            onChange={(mode) =>
              // Changing mode clears an entry point that no longer matches.
              edit({
                mode,
                entryPoint: ENTRY_POINTS.find((e) => e.id === draft.entryPoint)?.mode === mode ? draft.entryPoint : '',
              })
            }
            options={TRANSPORT_MODES.map((m) => {
              const Icon = MODE_STYLE[m].icon;
              return { value: m, label: t.modes[m], icon: <Icon className="h-4 w-4" aria-hidden /> };
            })}
          />
          <FormField label={t.declaration.entryPoint} error={err('entryPoint')}>
            <div role="radiogroup" aria-label={t.declaration.entryPoint} className="grid gap-2.5 sm:grid-cols-2">
              {ENTRY_POINTS.filter((e) => e.mode === draft.mode).map((e) => (
                <ChoiceCard
                  key={e.id}
                  selected={draft.entryPoint === e.id}
                  onSelect={() => edit({ entryPoint: e.id })}
                  icon={MODE_STYLE[e.mode].icon}
                  tone={MODE_STYLE[e.mode].tile}
                  title={e.name.replace(/\s*\(.*\)$/, '')}
                  body={e.mode === 'AIR' ? `${e.id} · ${e.name.match(/\((.*)\)/)?.[1] ?? ''}` : undefined}
                />
              ))}
            </div>
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label={draft.mode === 'SEA' ? t.declaration.transportDocSEA : t.declaration.transportDocAIR}
              htmlFor="transportDocument"
              hint={draft.mode === 'SEA' ? t.declare.docHintSEA : t.declare.docHintAIR}
              error={err('transportDocument')}
            >
              <TextField
                id="transportDocument"
                value={draft.transportDocument}
                onChange={(transportDocument) => edit({ transportDocument: transportDocument.toUpperCase() })}
                invalid={!!err('transportDocument')}
                className="font-mono"
              />
            </FormField>
            <FormField label={t.declaration.carrier} htmlFor="carrier" error={err('carrier')}>
              <TextField
                id="carrier"
                value={draft.carrier}
                onChange={(carrier) => edit({ carrier })}
                invalid={!!err('carrier')}
                placeholder={draft.mode === 'SEA' ? t.declare.carrierPlaceholderSEA : t.declare.carrierPlaceholderAIR}
              />
            </FormField>
          </div>
          <FormField label={t.declaration.expectedArrival} htmlFor="expectedArrival" error={err('expectedArrival')}>
            <TextField
              id="expectedArrival"
              type="date"
              value={draft.expectedArrival}
              onChange={(expectedArrival) => edit({ expectedArrival })}
              invalid={!!err('expectedArrival')}
            />
          </FormField>
        </StepSection>
      )}

      {step === 'origin' && (
        <StepSection title={t.declare.originTitle} body={t.declare.originBody}>
          <FormField label={t.declaration.supplier} htmlFor="supplier" error={err('supplier')}>
            <TextField
              id="supplier"
              value={draft.supplier}
              onChange={(supplier) => edit({ supplier })}
              invalid={!!err('supplier')}
            />
          </FormField>
          <FormField label={t.declaration.shipmentCountry} htmlFor="shipmentCountry" error={err('shipmentCountry')}>
            <SelectField
              id="shipmentCountry"
              value={draft.shipmentCountry}
              placeholder={t.declare.countryPlaceholder}
              onChange={(shipmentCountry) =>
                // Lines without an origin yet inherit the shipment country.
                edit({
                  shipmentCountry,
                  lines: draft.lines.map((l) => (l.originCountry ? l : { ...l, originCountry: shipmentCountry })),
                })
              }
              options={countryOptions}
              invalid={!!err('shipmentCountry')}
            />
          </FormField>
          <FormField label={t.declare.currency}>
            <Segmented
              label={t.declare.currency}
              value={draft.currency}
              onChange={(currency) => edit({ currency })}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
          </FormField>
        </StepSection>
      )}

      {step === 'products' && (
        <Products
          draft={draft}
          edit={edit}
          err={err}
          countryOptions={countryOptions}
          linesError={attempted.has('products') ? errText(v.errors.lines) : undefined}
        />
      )}

      {step === 'review' && (
        <StepSection title={t.declare.reviewTitle} body={t.declare.reviewBody}>
          <ReviewBlock title={t.declare.steps.transport} onEdit={() => goTo(0)}>
            <ReviewRow label={t.declaration.mode} value={t.modes[draft.mode]} />
            <ReviewRow
              label={t.declaration.entryPoint}
              value={ENTRY_POINTS.find((e) => e.id === draft.entryPoint)?.name}
            />
            <ReviewRow
              label={draft.mode === 'SEA' ? t.declaration.transportDocSEA : t.declaration.transportDocAIR}
              value={<span className="font-mono">{draft.transportDocument}</span>}
            />
            <ReviewRow label={t.declaration.carrier} value={draft.carrier} />
            <ReviewRow
              label={t.declaration.expectedArrival}
              value={draft.expectedArrival && date(draft.expectedArrival)}
            />
          </ReviewBlock>
          <ReviewBlock title={t.declare.steps.origin} onEdit={() => goTo(1)}>
            <ReviewRow label={t.declaration.supplier} value={draft.supplier} />
            <ReviewRow
              label={t.declaration.shipmentCountry}
              value={draft.shipmentCountry && country(draft.shipmentCountry)}
            />
            <ReviewRow label={t.declare.currency} value={draft.currency} />
          </ReviewBlock>
          <ReviewBlock title={t.declare.steps.products} onEdit={() => goTo(2)}>
            {draft.lines.map((l, i) => (
              <ReviewRow
                key={l.key}
                label={`${i + 1}. ${l.productName || '—'}`}
                value={
                  <span className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium text-ink-soft">
                      {l.quantity} × {l.unit} · {t.declaration.batch} {l.batchNumber}
                    </span>
                    <span>{money(lineTotal(l), draft.currency)}</span>
                  </span>
                }
              />
            ))}
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-bold">{t.declare.total}</span>
              <span className="font-display text-2xl font-extrabold">{money(total, draft.currency)}</span>
            </div>
          </ReviewBlock>
          {answering && (
            <FormField
              label={t.declare.response}
              htmlFor="response"
              hint={t.declare.responseHint}
              error={err('response')}
            >
              <TextArea
                id="response"
                value={draft.response}
                onChange={(response) => edit({ response })}
                invalid={!!err('response')}
              />
            </FormField>
          )}
          <Checkbox
            id="attest"
            checked={draft.attest}
            onChange={(attest) => edit({ attest })}
            invalid={!!err('attest')}
          >
            {t.declare.attest}
          </Checkbox>
        </StepSection>
      )}
    </WizardFrame>
  );
}

function Products({
  draft,
  edit,
  err,
  countryOptions,
  linesError,
}: {
  draft: DeclarationDraft;
  edit: (p: Partial<DeclarationDraft>) => void;
  err: (key: string) => string | undefined;
  countryOptions: { value: string; label: string }[];
  linesError?: string;
}) {
  const { t } = useI18n();
  const setLine = (key: string, patch: Partial<LineDraft>) =>
    edit({ lines: draft.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });
  const add = (line: LineDraft) => {
    haptic();
    edit({ lines: [...draft.lines, line] });
    // Focus the new line's first field the importer has to fill.
    setTimeout(
      () => document.getElementById(`${line.key}-${line.fromRegister ? 'manufacturer' : 'productName'}`)?.focus(),
      60,
    );
  };

  return (
    <StepSection title={t.declare.productsTitle} body={t.declare.productsBody}>
      <ProductSearch
        onPick={(p) => add(lineFromRegister(p, draft.shipmentCountry))}
        onEmpty={() => add(emptyLine(draft.shipmentCountry))}
      />
      {linesError && draft.lines.length === 0 && <p className="text-xs font-semibold text-red-700">{linesError}</p>}
      {draft.lines.length === 0 ? (
        <p className="rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
          {t.declare.noLines}
        </p>
      ) : (
        <ol className="space-y-4">
          {draft.lines.map((l, i) => (
            <LineEditor
              key={l.key}
              line={l}
              index={i}
              currency={draft.currency}
              arrival={draft.expectedArrival}
              countryOptions={countryOptions}
              err={(field) => err(`lines.${i}.${field}`)}
              onChange={(patch) => setLine(l.key, patch)}
              onRemove={() => edit({ lines: draft.lines.filter((x) => x.key !== l.key) })}
            />
          ))}
        </ol>
      )}
      {draft.lines.length > 0 && (
        <button
          type="button"
          onClick={() => add(emptyLine(draft.shipmentCountry))}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-4 text-sm font-bold text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t.declare.addEmpty}
        </button>
      )}
    </StepSection>
  );
}

/** Search the AMM register; picking a product adds a prefilled line. */
function ProductSearch({ onPick, onEmpty }: { onPick: (p: ProductReference) => void; onEmpty: () => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const products = useQuery({ queryKey: ['products'], queryFn: () => data.listProducts(), staleTime: Infinity });
  const needle = q.trim().toLowerCase();
  const results = needle
    ? (products.data ?? []).filter((p) =>
        [p.productName, p.inn, p.ammNumber].some((v) => v.toLowerCase().includes(needle)),
      )
    : (products.data ?? []);

  return (
    <div className="rounded-3xl bg-ink p-4 text-white sm:p-5">
      <label htmlFor="product-search" className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Search className="h-4 w-4 text-sun" aria-hidden />
        {t.declare.search}
      </label>
      <input
        id="product-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.declare.searchPlaceholder}
        className="w-full rounded-2xl border-2 border-transparent bg-white/10 px-4 py-3 text-[15px] font-medium text-white outline-none placeholder:text-white/40 focus:border-sun focus-visible:outline-none"
      />
      <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1" aria-label={t.declare.search}>
        {results.slice(0, 8).map((p) => (
          <li key={p.ammNumber}>
            <button
              type="button"
              onClick={() => {
                onPick(p);
                setQ('');
              }}
              className="group flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.12]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {p.productName} <span className="font-medium text-white/60">· {p.strength}</span>
                </span>
                <span className="block truncate text-xs text-white/55">
                  {p.inn} · {t.declaration.dosageForms[p.dosageForm]} · {p.ammNumber}
                </span>
              </span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sun text-ink transition-transform group-hover:scale-110">
                <Plus className="h-4 w-4" strokeWidth={2.8} aria-hidden />
              </span>
            </button>
          </li>
        ))}
        {needle && results.length === 0 && <li className="px-1 py-2 text-sm text-white/60">{t.declare.noMatch}</li>}
      </ul>
      <button
        type="button"
        onClick={onEmpty}
        className="mt-3 text-xs font-bold text-white/70 underline-offset-4 hover:text-white hover:underline"
      >
        {t.declare.addEmpty}
      </button>
    </div>
  );
}

function LineEditor({
  line: l,
  index,
  currency,
  arrival,
  countryOptions,
  err,
  onChange,
  onRemove,
}: {
  line: LineDraft;
  index: number;
  currency: string;
  arrival: string;
  countryOptions: { value: string; label: string }[];
  err: (field: string) => string | undefined;
  onChange: (p: Partial<LineDraft>) => void;
  onRemove: () => void;
}) {
  const { t, f, money } = useI18n();
  const id = (field: string) => `${l.key}-${field}`;
  const short = arrival && l.expiryDate && shortShelfLife({ expiryDate: l.expiryDate }, arrival);
  const text = (field: keyof LineDraft, label: string, extra: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <FormField label={label} htmlFor={id(field)} error={err(field)}>
      <TextField
        id={id(field)}
        value={l[field] as string}
        onChange={(value) => onChange({ [field]: value })}
        invalid={!!err(field)}
        {...extra}
      />
    </FormField>
  );

  return (
    <li className="rounded-3xl border border-line bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            {f(t.declare.line, { n: index + 1 })}
          </p>
          <p className="truncate font-display text-lg font-extrabold">{l.productName || '—'}</p>
          {l.fromRegister && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-ok">
              <Check className="h-3.5 w-3.5" aria-hidden />
              {t.declare.prefilled}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t.declare.remove}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {!l.fromRegister && (
          <>
            {text('productName', t.declaration.product)}
            {text('inn', t.declaration.inn)}
            <FormField label={t.declaration.form} htmlFor={id('dosageForm')} error={err('dosageForm')}>
              <SelectField
                id={id('dosageForm')}
                value={l.dosageForm}
                placeholder="—"
                onChange={(v) => onChange({ dosageForm: v as LineDraft['dosageForm'] })}
                options={DOSAGE_FORMS.map((d) => ({ value: d, label: t.declaration.dosageForms[d] }))}
                invalid={!!err('dosageForm')}
              />
            </FormField>
            {text('strength', t.declaration.strength)}
            {text('ammNumber', t.declaration.amm, { className: 'font-mono' })}
            {text('hsCode', t.declaration.hs, { inputMode: 'numeric', className: 'font-mono' })}
          </>
        )}
        {text('manufacturer', t.declaration.manufacturer)}
        <FormField label={t.declaration.origin} htmlFor={id('originCountry')} error={err('originCountry')}>
          <SelectField
            id={id('originCountry')}
            value={l.originCountry}
            placeholder={t.declare.countryPlaceholder}
            onChange={(originCountry) => onChange({ originCountry })}
            options={countryOptions}
            invalid={!!err('originCountry')}
          />
        </FormField>
        {text('batchNumber', t.declaration.batch, { className: 'font-mono' })}
        <FormField label={t.declaration.expiry} htmlFor={id('expiryDate')} error={err('expiryDate')}>
          <TextField
            id={id('expiryDate')}
            type="date"
            value={l.expiryDate}
            onChange={(expiryDate) => onChange({ expiryDate })}
            invalid={!!err('expiryDate')}
          />
          {short && !err('expiryDate') && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-warn">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {f(t.declaration.shortShelfLife, { months: MIN_SHELF_LIFE_MONTHS })}
            </p>
          )}
        </FormField>
        {text('quantity', t.declaration.quantity, { inputMode: 'numeric', placeholder: '0' })}
        {text('unit', t.declaration.unit, { placeholder: t.declare.unitPlaceholder })}
        <FormField label={t.declaration.unitPrice} htmlFor={id('unitPrice')} error={err('unitPrice')}>
          <PrefixField
            id={id('unitPrice')}
            prefix={currency}
            value={l.unitPrice}
            onChange={(unitPrice) => onChange({ unitPrice: unitPrice.replace(/[^\d.,\s]/g, '') })}
            invalid={!!err('unitPrice')}
            inputMode="decimal"
            placeholder="0,00"
          />
        </FormField>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t.declare.lineTotal}</span>
        <span className="font-display text-lg font-extrabold">{money(lineTotal(l), currency)}</span>
      </div>
    </li>
  );
}
