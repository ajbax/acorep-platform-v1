import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Building2, Check, Crosshair, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import {
  ESTABLISHMENT_KINDS,
  PROVINCES,
  provinceName,
  type Establishment,
  type EstablishmentKind,
  type ProvinceCode,
} from '@acorep/shared';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { data } from '@/services';
import { useAuth } from '@/features/auth/AuthProvider';
import { KIND_ICON } from '@/components/nav/NavPreview';
import {
  Checkbox,
  ChoiceCard,
  FormField,
  PrefixField,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  StepSection,
  TextField,
} from '@/components/form';
import { ReviewBlock, ReviewRow, WizardFrame, WizardSuccess } from '@/components/Wizard';
import { buttonClass } from '@/components/ui';
import {
  initialRegisterDraft,
  registerSteps,
  toE164,
  validateRegister,
  type RegisterDraft,
  type RegisterStep,
} from './draft';

/** Establishment registration: self-service (creates the account) or by staff on someone's behalf. */
export function RegisterWizard({ exitTo }: { exitTo: string }) {
  const { t, f } = useI18n();
  const { session, signIn } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  // Decided once: signing in at the end must not turn the success screen into a staff form.
  const [selfService] = useState(() => !session);
  const fixedProvince = session?.role === 'PROVINCIAL_OFFICER' ? session.province : undefined;
  const presetKind = ESTABLISHMENT_KINDS.find((k) => k === params.get('type'));

  const [draft, setDraft] = useState<RegisterDraft>(() => initialRegisterDraft(presetKind, fixedProvince));
  const [stepIdx, setStepIdx] = useState(0);
  const [attempted, setAttempted] = useState<Set<RegisterStep>>(new Set());
  const [done, setDone] = useState<Establishment | null>(null);

  const steps = registerSteps(selfService);
  const step = steps[stepIdx]!;
  const isLast = stepIdx === steps.length - 1;
  const v = validateRegister(draft, selfService);
  const edit = (patch: Partial<RegisterDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const err = (key: string): string | undefined => {
    if (!attempted.has(step)) return undefined;
    const code = v.errors[key];
    if (!code) return undefined;
    return (
      (t.establishment.errors as Record<string, string>)[code] ??
      (t.register.errors as Record<string, string>)[code] ??
      t.establishment.errors.required
    );
  };

  const submit = useMutation({
    mutationFn: () =>
      data.registerEstablishment(
        v.input!,
        selfService ? { name: draft.accountName.trim(), email: draft.accountEmail.trim() } : undefined,
      ),
    onSuccess: ({ establishment, session: created }) => {
      haptic([10, 40, 20]);
      if (created) signIn(created);
      void qc.invalidateQueries({ queryKey: ['establishments'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      setDone(establishment);
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
      if (v.input) submit.mutate();
      return;
    }
    haptic();
    goTo(stepIdx + 1);
  };

  if (done) {
    return (
      <WizardSuccess
        icon={Check}
        title={t.register.successTitle}
        body={f(t.register.successBody, { province: provinceName(done.province) })}
      >
        <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t.register.successRef}</p>
          <p className="mt-1 font-mono text-lg font-bold">{done.id.toUpperCase()}</p>
          <p className="mt-6 font-display text-lg font-extrabold">{t.register.nextTitle}</p>
          <ol className="mt-3 space-y-3">
            {t.register.next.map((n, i) => (
              <li key={n} className="flex items-center gap-3 text-sm font-semibold">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? 'bg-ink text-white' : 'bg-surface text-ink-soft'}`}
                >
                  {i + 1}
                </span>
                {n}
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to={`/etablissements/${done.id}`} className={`${buttonClass('primary')} min-h-14 flex-1 text-base`}>
            {t.register.open}
          </Link>
          {!selfService && (
            <button
              type="button"
              onClick={() => {
                setDone(null);
                setDraft(initialRegisterDraft(undefined, fixedProvince));
                setAttempted(new Set());
                setStepIdx(0);
              }}
              className={`${buttonClass('ghost')} min-h-14 flex-1 text-base`}
            >
              {t.register.another}
            </button>
          )}
        </div>
      </WizardSuccess>
    );
  }

  const showFixHint = attempted.has(step) && v.stepHasErrors(step);
  return (
    <WizardFrame
      icon={Building2}
      eyebrow={t.register.eyebrow}
      title={t.register.title}
      steps={steps.map((s) => ({ key: s, label: t.register.steps[s] }))}
      index={stepIdx}
      exitTo={exitTo}
      footer={
        <div className="space-y-2">
          {(showFixHint || submit.isError) && (
            <p role="alert" className="text-center text-xs font-semibold text-red-700">
              {submit.isError
                ? (t.apiErrors[submit.error.message] ?? t.app.error)
                : step === 'review' && !draft.attest
                  ? t.wizard.attestRequired
                  : t.wizard.fixErrors}
            </p>
          )}
          <div className="flex gap-3">
            {stepIdx > 0 && (
              <SecondaryButton onClick={() => goTo(stepIdx - 1)}>
                <ArrowLeft className="h-5 w-5" aria-hidden />
                <span className="sr-only sm:not-sr-only">{t.wizard.previous}</span>
              </SecondaryButton>
            )}
            <PrimaryButton onClick={goNext} disabled={submit.isPending}>
              {submit.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  {t.wizard.sending}
                </>
              ) : isLast ? (
                t.register.submit
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
      {!selfService && session && stepIdx === 0 && (
        <p className="flex items-start gap-2.5 rounded-2xl bg-accent-soft p-4 text-sm font-medium text-accent">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {f(t.register.staffNote, { role: t.roles[session.role].toLowerCase() })}
        </p>
      )}
      {step === 'activity' && <Activity draft={draft} edit={edit} err={err} />}
      {step === 'identity' && <Identity draft={draft} edit={edit} err={err} />}
      {step === 'location' && <Location draft={draft} edit={edit} err={err} fixedProvince={fixedProvince} />}
      {step === 'people' && <People draft={draft} edit={edit} err={err} />}
      {step === 'account' && <Account draft={draft} edit={edit} err={err} />}
      {step === 'review' && (
        <Review
          draft={draft}
          edit={edit}
          invalid={attempted.has('review') && !draft.attest}
          goTo={(s) => goTo(steps.indexOf(s))}
          selfService={selfService}
        />
      )}
    </WizardFrame>
  );
}

interface StepProps {
  draft: RegisterDraft;
  edit: (p: Partial<RegisterDraft>) => void;
  err: (key: string) => string | undefined;
}

function Activity({ draft, edit, err }: StepProps) {
  const { t } = useI18n();
  return (
    <>
      <StepSection title={t.register.activityTitle} body={t.register.activityBody}>
        <div role="radiogroup" aria-label={t.common.kind} className="grid gap-2.5">
          {ESTABLISHMENT_KINDS.map((k) => (
            <ChoiceCard
              key={k}
              selected={draft.kind === k}
              onSelect={() => edit({ kind: k })}
              icon={KIND_ICON[k]}
              tone={draft.kind === k ? 'bg-sun text-ink' : 'bg-white text-ink'}
              title={t.establishment.kinds[k]}
              body={t.register.kindBody[k]}
            />
          ))}
        </div>
        {err('kind') && <p className="text-xs font-semibold text-red-700">{err('kind')}</p>}
      </StepSection>
      <StepSection title={t.register.namesTitle}>
        <FormField label={t.establishment.legalName} htmlFor="legalName" error={err('legalName')}>
          <TextField
            id="legalName"
            value={draft.legalName}
            onChange={(legalName) => edit({ legalName })}
            invalid={!!err('legalName')}
            autoComplete="organization"
          />
        </FormField>
        <FormField label={t.establishment.tradeName} htmlFor="tradeName" optional optionalLabel={t.common.optional}>
          <TextField id="tradeName" value={draft.tradeName} onChange={(tradeName) => edit({ tradeName })} />
        </FormField>
      </StepSection>
    </>
  );
}

function Identity({ draft, edit, err }: StepProps) {
  const { t } = useI18n();
  return (
    <StepSection title={t.register.identityTitle} body={t.register.identityBody}>
      <FormField label={t.establishment.rccm} htmlFor="rccm" hint={t.register.rccmHint} error={err('rccm')}>
        <TextField
          id="rccm"
          value={draft.rccm}
          onChange={(rccm) => edit({ rccm })}
          invalid={!!err('rccm')}
          placeholder="CD/KNG/RCCM/23-B-01234"
          className="font-mono uppercase"
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t.establishment.idNat} htmlFor="idNat" hint={t.register.idNatHint} error={err('idNat')}>
          <TextField id="idNat" value={draft.idNat} onChange={(idNat) => edit({ idNat })} invalid={!!err('idNat')} />
        </FormField>
        <FormField label={t.establishment.nif} htmlFor="nif" hint={t.register.nifHint} error={err('nif')}>
          <TextField id="nif" value={draft.nif} onChange={(nif) => edit({ nif })} invalid={!!err('nif')} />
        </FormField>
      </div>
      <FormField
        label={t.establishment.gln}
        htmlFor="gln"
        hint={t.register.glnHint}
        error={err('gln')}
        optional
        optionalLabel={t.common.optional}
      >
        <TextField
          id="gln"
          value={draft.gln}
          onChange={(gln) => edit({ gln: gln.replace(/\D/g, '') })}
          invalid={!!err('gln')}
          inputMode="numeric"
          maxLength={13}
        />
      </FormField>
    </StepSection>
  );
}

function Location({ draft, edit, err, fixedProvince }: StepProps & { fixedProvince?: ProvinceCode }) {
  const { t, f } = useI18n();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const capital = PROVINCES.find((p) => p.code === draft.province)?.capital;

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    setLocating(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        haptic();
        edit({ lat: pos.coords.latitude.toFixed(6), lon: pos.coords.longitude.toFixed(6) });
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <>
      <StepSection title={t.register.locationTitle} body={t.register.locationBody}>
        <FormField label={t.common.province} htmlFor="province" error={err('province')}>
          {fixedProvince ? (
            <p className="rounded-2xl bg-surface px-4 py-3 text-[15px] font-semibold">{provinceName(fixedProvince)}</p>
          ) : (
            <SelectField
              id="province"
              value={draft.province}
              placeholder={t.common.allProvinces}
              onChange={(v) => {
                const p = PROVINCES.find((x) => x.code === v)!;
                // Prefill the city with the capital unless the user already typed one.
                edit({ province: p.code, city: draft.city || p.capital });
              }}
              options={PROVINCES.map((p) => ({ value: p.code, label: p.name }))}
              invalid={!!err('province')}
            />
          )}
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t.common.city} htmlFor="city" error={err('city')}>
            <TextField
              id="city"
              value={draft.city}
              onChange={(city) => edit({ city })}
              invalid={!!err('city')}
              list="city-suggestions"
              autoComplete="address-level2"
            />
            <datalist id="city-suggestions">{capital && <option value={capital} />}</datalist>
          </FormField>
          <FormField label={t.register.commune} htmlFor="commune" optional optionalLabel={t.common.optional}>
            <TextField id="commune" value={draft.commune} onChange={(commune) => edit({ commune })} />
          </FormField>
        </div>
        <FormField label={t.establishment.address} htmlFor="address" error={err('address')}>
          <TextField
            id="address"
            value={draft.address}
            onChange={(address) => edit({ address })}
            invalid={!!err('address')}
            placeholder={t.register.addressPlaceholder}
            autoComplete="street-address"
          />
        </FormField>
      </StepSection>

      <StepSection title={t.register.gpsTitle} body={t.register.gpsBody}>
        {draft.lat && draft.lon ? (
          <div className="flex items-center gap-3 rounded-2xl bg-ok-soft p-4 text-sm font-semibold text-ok">
            <MapPin className="h-5 w-5 shrink-0" aria-hidden />
            <span className="flex-1">{f(t.register.positionFound, { lat: draft.lat, lon: draft.lon })}</span>
            <button
              type="button"
              onClick={() => edit({ lat: '', lon: '' })}
              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-soft hover:text-ink"
            >
              {t.register.clearPosition}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-4 text-sm font-bold text-ink transition-colors hover:border-ink disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Crosshair className="h-5 w-5" aria-hidden />
            )}
            {locating ? t.register.locating : t.register.useMyPosition}
          </button>
        )}
        {(geoError || err('location')) && (
          <p className="text-xs font-semibold text-red-700">{err('location') ?? t.register.positionError}</p>
        )}
      </StepSection>
    </>
  );
}

function PhoneInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  const { t } = useI18n();
  // Typing "+…" switches to an international number; otherwise +243 is implied.
  return value.trim().startsWith('+') ? (
    <TextField id={id} value={value} onChange={onChange} invalid={invalid} inputMode="tel" autoComplete="tel" />
  ) : (
    <PrefixField
      id={id}
      prefix="+243"
      value={value}
      onChange={onChange}
      invalid={invalid}
      inputMode="tel"
      autoComplete="tel-national"
      placeholder={t.register.phonePlaceholder}
    />
  );
}

function People({ draft, edit, err }: StepProps) {
  const { t } = useI18n();
  return (
    <>
      <StepSection title={t.register.peopleTitle} body={t.register.peopleBody}>
        <FormField label={t.register.pharmacistName} htmlFor="pharmacistName" error={err('pharmacist.name')}>
          <TextField
            id="pharmacistName"
            value={draft.pharmacistName}
            onChange={(pharmacistName) => edit({ pharmacistName })}
            invalid={!!err('pharmacist.name')}
            autoComplete="name"
          />
        </FormField>
        <FormField
          label={t.establishment.orderNumber}
          htmlFor="orderNumber"
          hint={t.register.orderHint}
          error={err('pharmacist.orderNumber')}
        >
          <TextField
            id="orderNumber"
            value={draft.orderNumber}
            onChange={(orderNumber) => edit({ orderNumber })}
            invalid={!!err('pharmacist.orderNumber')}
            placeholder="CNOP/1234"
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t.establishment.phone} htmlFor="pharmacistPhone" error={err('pharmacist.phone')}>
            <PhoneInput
              id="pharmacistPhone"
              value={draft.pharmacistPhone}
              onChange={(pharmacistPhone) => edit({ pharmacistPhone })}
              invalid={!!err('pharmacist.phone')}
            />
          </FormField>
          <FormField
            label={t.establishment.email}
            htmlFor="pharmacistEmail"
            error={err('pharmacist.email')}
            optional
            optionalLabel={t.common.optional}
          >
            <TextField
              id="pharmacistEmail"
              type="email"
              value={draft.pharmacistEmail}
              onChange={(pharmacistEmail) => edit({ pharmacistEmail })}
              invalid={!!err('pharmacist.email')}
              autoComplete="email"
            />
          </FormField>
        </div>
      </StepSection>
      <StepSection title={t.register.contactTitle} body={t.register.contactBody}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t.establishment.phone} htmlFor="contactPhone" error={err('contact.phone')}>
            <PhoneInput
              id="contactPhone"
              value={draft.contactPhone}
              onChange={(contactPhone) => edit({ contactPhone })}
              invalid={!!err('contact.phone')}
            />
          </FormField>
          <FormField
            label={t.establishment.email}
            htmlFor="contactEmail"
            error={err('contact.email')}
            optional
            optionalLabel={t.common.optional}
          >
            <TextField
              id="contactEmail"
              type="email"
              value={draft.contactEmail}
              onChange={(contactEmail) => edit({ contactEmail })}
              invalid={!!err('contact.email')}
            />
          </FormField>
        </div>
      </StepSection>
    </>
  );
}

function Account({ draft, edit, err }: StepProps) {
  const { t } = useI18n();
  return (
    <StepSection title={t.register.accountTitle} body={t.register.accountBody}>
      <FormField label={t.register.accountName} htmlFor="accountName" error={err('accountName')}>
        <TextField
          id="accountName"
          value={draft.accountName}
          onChange={(accountName) => edit({ accountName })}
          invalid={!!err('accountName')}
          autoComplete="name"
        />
      </FormField>
      <FormField label={t.register.accountEmail} htmlFor="accountEmail" error={err('accountEmail')}>
        <TextField
          id="accountEmail"
          type="email"
          value={draft.accountEmail}
          onChange={(accountEmail) => edit({ accountEmail })}
          invalid={!!err('accountEmail')}
          autoComplete="email"
        />
      </FormField>
      <p className="flex items-start gap-2.5 rounded-2xl bg-accent-soft p-4 text-sm font-medium text-accent">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t.register.accountNote}
      </p>
    </StepSection>
  );
}

function Review({
  draft,
  edit,
  invalid,
  goTo,
  selfService,
}: {
  draft: RegisterDraft;
  edit: (p: Partial<RegisterDraft>) => void;
  invalid: boolean;
  goTo: (s: RegisterStep) => void;
  selfService: boolean;
}) {
  const { t } = useI18n();
  const kind = draft.kind as EstablishmentKind;
  return (
    <StepSection title={t.register.reviewTitle} body={t.register.reviewBody}>
      <ReviewBlock title={t.register.steps.activity} onEdit={() => goTo('activity')}>
        <ReviewRow label={t.common.kind} value={kind && t.establishment.kinds[kind]} />
        <ReviewRow label={t.establishment.legalName} value={draft.legalName} />
        <ReviewRow label={t.establishment.tradeName} value={draft.tradeName} />
      </ReviewBlock>
      <ReviewBlock title={t.register.steps.identity} onEdit={() => goTo('identity')}>
        <ReviewRow label={t.establishment.rccm} value={<span className="font-mono">{draft.rccm.toUpperCase()}</span>} />
        <ReviewRow label={t.establishment.idNat} value={draft.idNat} />
        <ReviewRow label={t.establishment.nif} value={draft.nif} />
        {draft.gln && <ReviewRow label={t.establishment.gln} value={draft.gln} />}
      </ReviewBlock>
      <ReviewBlock title={t.register.steps.location} onEdit={() => goTo('location')}>
        <ReviewRow label={t.common.province} value={draft.province && provinceName(draft.province)} />
        <ReviewRow label={t.common.city} value={[draft.commune, draft.city].filter(Boolean).join(', ')} />
        <ReviewRow label={t.establishment.address} value={draft.address} />
        <ReviewRow label={t.establishment.gps} value={draft.lat && `${draft.lat}, ${draft.lon}`} />
      </ReviewBlock>
      <ReviewBlock title={t.register.steps.people} onEdit={() => goTo('people')}>
        <ReviewRow label={t.establishment.pharmacist} value={draft.pharmacistName} />
        <ReviewRow label={t.establishment.orderNumber} value={draft.orderNumber} />
        <ReviewRow label={t.establishment.phone} value={toE164(draft.pharmacistPhone)} />
        <ReviewRow label={t.establishment.contact} value={toE164(draft.contactPhone)} />
      </ReviewBlock>
      {selfService && (
        <ReviewBlock title={t.register.steps.account} onEdit={() => goTo('account')}>
          <ReviewRow label={t.register.accountName} value={draft.accountName} />
          <ReviewRow label={t.register.accountEmail} value={draft.accountEmail} />
        </ReviewBlock>
      )}
      <Checkbox id="attest" checked={draft.attest} onChange={(attest) => edit({ attest })} invalid={invalid}>
        {t.register.attest}
      </Checkbox>
    </StepSection>
  );
}
