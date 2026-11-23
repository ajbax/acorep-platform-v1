import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MailCheck,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { Checkbox, FormField, PrimaryButton, TextField, inputClass } from '@/components/form';
import { IconTile, Mark, buttonClass } from '@/components/ui';
import { AuthBrandPanel } from './AuthBrand';
import { CodeInput } from './CodeInput';

/**
 * DESIGN PREVIEW of the production sign-in (/connexion-2): e-mail + password, then a TOTP code
 * (NIST SP 800-63B AAL2), with password reset and backup codes. It never creates a session.
 * In production these steps map to Cognito: InitiateAuth (USER_SRP_AUTH) → SOFTWARE_TOKEN_MFA
 * challenge → RespondToAuthChallenge, and ForgotPassword for the reset.
 */
type Step = 'credentials' | 'mfa' | 'forgot' | 'sent' | 'done';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BACKUP = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const MAX_ATTEMPTS = 5;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "prenom.nom@exemple.cd" → "pr•••••••@exemple.cd" (shown on the code step). */
const maskEmail = (e: string) => {
  const [user = '', domain = ''] = e.split('@');
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(3, user.length - 2))}@${domain}`;
};

export function ProductionSignInPage() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <AuthBrandPanel />
      <main className="flex min-w-0 flex-col px-4 py-6 sm:px-10">
        <PreviewBanner />
        <div className="flex flex-1 items-center justify-center py-8">
          <motion.div
            key={step}
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="w-full max-w-md"
          >
            {step === 'credentials' && (
              <Credentials
                email={email}
                setEmail={setEmail}
                onNext={() => setStep('mfa')}
                onForgot={() => setStep('forgot')}
              />
            )}
            {step === 'mfa' && (
              <Mfa email={email} onBack={() => setStep('credentials')} onDone={() => setStep('done')} />
            )}
            {step === 'forgot' && (
              <Forgot
                email={email}
                setEmail={setEmail}
                onBack={() => setStep('credentials')}
                onSent={() => setStep('sent')}
              />
            )}
            {step === 'sent' && <Sent email={email} onBack={() => setStep('credentials')} />}
            {step === 'done' && <Done />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function PreviewBanner() {
  const { t } = useI18n();
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-sun-soft px-4 py-3 text-xs text-sun-deep">
      <p className="font-bold">{t.signInProd.preview}</p>
      <p className="mt-0.5">{t.signInProd.previewHint}</p>
    </div>
  );
}

function Heading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <>
      <Mark className="mb-8 h-14 w-14 lg:hidden" />
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {eyebrow}
      </p>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">{title}</h1>
      {body && <p className="mt-2 text-ink-soft">{body}</p>}
    </>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-surface py-1.5 pl-2.5 pr-3.5 text-xs font-bold text-ink-soft transition-colors hover:bg-line hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function Credentials({
  email,
  setEmail,
  onNext,
  onForgot,
}: {
  email: string;
  setEmail: (v: string) => void;
  onNext: () => void;
  onForgot: () => void;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const emailError = tried && !EMAIL.test(email.trim()) ? t.signInProd.errors.email : undefined;
  const passwordError = tried && !password ? t.signInProd.errors.password : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!EMAIL.test(email.trim()) || !password) {
      haptic([20, 30, 20]);
      return;
    }
    setPending(true);
    await wait(700);
    setPending(false);
    haptic();
    onNext();
  };

  return (
    <>
      <Heading eyebrow={t.signInProd.eyebrow} title={t.signInProd.title} body={t.signInProd.intro} />
      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <FormField label={t.signInProd.email} htmlFor="email" error={emailError}>
          <TextField
            id="email"
            type="email"
            value={email}
            onChange={setEmail}
            invalid={!!emailError}
            autoComplete="username"
            inputMode="email"
            placeholder={t.signInProd.emailPlaceholder}
          />
        </FormField>
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="text-sm font-bold">
              {t.signInProd.password}
            </label>
            <button
              type="button"
              onClick={onForgot}
              className="text-xs font-bold text-accent underline-offset-4 hover:underline"
            >
              {t.signInProd.forgot}
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={!!passwordError || undefined}
              aria-describedby={passwordError ? 'password-error' : undefined}
              className={`${inputClass} pr-12 ${passwordError ? 'border-red-500 bg-red-50/40' : ''}`}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? t.signInProd.hide : t.signInProd.show}
              aria-pressed={visible}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-ink-soft hover:bg-line hover:text-ink"
            >
              {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {passwordError && (
            <p id="password-error" className="mt-1.5 text-xs font-semibold text-red-700">
              {passwordError}
            </p>
          )}
        </div>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {t.signInProd.checking}
            </>
          ) : (
            <>
              {t.signInProd.submit}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </>
          )}
        </PrimaryButton>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3.5">
        <span className="text-sm font-semibold text-ink-soft">{t.signIn.newEstablishment}</span>
        <Link
          to="/inscription"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-[#13264a]"
        >
          {t.signIn.registerLink}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-6 space-y-2 text-xs text-ink-soft">
        <p className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-ok" aria-hidden />
          {t.signInProd.secureNote}
        </p>
        <p className="flex items-start gap-2">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          {t.signInProd.lockNote}
        </p>
      </div>
    </>
  );
}

function Mfa({ email, onBack, onDone }: { email: string; onBack: () => void; onDone: () => void }) {
  const { t, f } = useI18n();
  const [mode, setMode] = useState<'app' | 'backup'>('app');
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState('');
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [pending, setPending] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'app') codeRef.current?.focus();
  }, [mode]);

  const verify = async (value: string) => {
    if (mode === 'app' && value.length !== 6) {
      setError(t.signInProd.errors.codeLength);
      return;
    }
    if (mode === 'backup' && !BACKUP.test(value)) {
      setError(t.signInProd.errors.backup);
      return;
    }
    setPending(true);
    setError(null);
    await wait(600);
    setPending(false);
    // Preview: 000000 simulates a wrong code.
    if (mode === 'app' && value === '000000') {
      const n = attempts + 1;
      setAttempts(n);
      setError(f(t.signInProd.errors.code, { n: MAX_ATTEMPTS - n }));
      setCode('');
      haptic([20, 30, 20]);
      codeRef.current?.focus();
      return;
    }
    haptic([10, 40, 20]);
    onDone();
  };

  return (
    <>
      <BackButton onClick={onBack} label={t.signInProd.changeAccount} />
      <IconTile icon={mode === 'app' ? Smartphone : KeyRound} size="lg" tone="bg-sun text-ink" />
      <div className="mt-6">
        <Heading eyebrow={t.signInProd.mfaEyebrow} title={t.signInProd.mfaTitle} body={t.signInProd.mfaBody} />
      </div>
      <p className="mt-3 inline-flex rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink-soft">
        {f(t.signInProd.mfaAccount, { email: maskEmail(email) })}
      </p>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void verify(mode === 'app' ? code : backup.trim().toUpperCase());
        }}
        className="mt-8 space-y-5"
      >
        {mode === 'app' ? (
          <div>
            <label htmlFor="otp" className="mb-2 block text-sm font-bold">
              {t.signInProd.codeLabel}
            </label>
            <CodeInput
              ref={codeRef}
              id="otp"
              value={code}
              disabled={pending}
              invalid={!!error}
              onChange={(v) => {
                setCode(v);
                setError(null);
                // Submit as soon as the sixth digit is typed or pasted.
                if (v.length === 6) void verify(v);
              }}
            />
          </div>
        ) : (
          <FormField label={t.signInProd.backupLabel} htmlFor="backup" hint={t.signInProd.backupHint}>
            <TextField
              id="backup"
              value={backup}
              onChange={(v) => {
                setBackup(v.toUpperCase());
                setError(null);
              }}
              invalid={!!error}
              placeholder="XXXX-XXXX"
              autoComplete="one-time-code"
              className="font-mono text-lg tracking-[0.2em]"
              maxLength={9}
            />
          </FormField>
        )}
        {error && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <Checkbox id="trust" checked={trust} onChange={setTrust}>
          {t.signInProd.trust}
        </Checkbox>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : t.signInProd.verify}
        </PrimaryButton>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'app' ? 'backup' : 'app'));
            setError(null);
          }}
          className="text-sm font-bold text-accent underline-offset-4 hover:underline"
        >
          {mode === 'app' ? t.signInProd.useBackup : t.signInProd.useApp}
        </button>
        <p className="text-xs text-ink-soft">{t.signInProd.lostDevice}</p>
      </div>
    </>
  );
}

function Forgot({
  email,
  setEmail,
  onBack,
  onSent,
}: {
  email: string;
  setEmail: (v: string) => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const error = tried && !EMAIL.test(email.trim()) ? t.signInProd.errors.email : undefined;
  return (
    <>
      <BackButton onClick={onBack} label={t.signInProd.backToSignIn} />
      <IconTile icon={KeyRound} size="lg" tone="bg-sun text-ink" />
      <div className="mt-6">
        <Heading eyebrow={t.signInProd.eyebrow} title={t.signInProd.forgotTitle} body={t.signInProd.forgotBody} />
      </div>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setTried(true);
          if (!EMAIL.test(email.trim())) return;
          setPending(true);
          await wait(700);
          onSent();
        }}
        className="mt-8 space-y-5"
      >
        <FormField label={t.signInProd.email} htmlFor="reset-email" error={error}>
          <TextField
            id="reset-email"
            type="email"
            value={email}
            onChange={setEmail}
            invalid={!!error}
            autoComplete="username"
            placeholder={t.signInProd.emailPlaceholder}
          />
        </FormField>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : t.signInProd.sendLink}
        </PrimaryButton>
      </form>
    </>
  );
}

/** Same message whether or not the account exists, so the form can't be used to find accounts. */
function Sent({ email, onBack }: { email: string; onBack: () => void }) {
  const { t, f } = useI18n();
  return (
    <div className="text-center">
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-accent">
        <MailCheck className="h-9 w-9" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-[30px] font-extrabold leading-tight">{t.signInProd.sentTitle}</h1>
      <p className="mt-2 text-ink-soft">{f(t.signInProd.sentBody, { email: email.trim() })}</p>
      <button type="button" onClick={onBack} className={`${buttonClass('ghost')} mt-8 min-h-14 w-full text-base`}>
        {t.signInProd.backToSignIn}
      </button>
    </div>
  );
}

function Done() {
  const { t } = useI18n();
  return (
    <div className="text-center">
      <motion.span
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun text-ink shadow-lg shadow-sun/40"
      >
        <Check className="h-10 w-10" strokeWidth={2.4} aria-hidden />
      </motion.span>
      <h1 className="mt-6 font-display text-[30px] font-extrabold leading-tight">{t.signInProd.doneTitle}</h1>
      <p className="mt-2 text-ink-soft">{t.signInProd.doneBody}</p>
      <Link to="/connexion" className={`${buttonClass('primary')} mt-8 min-h-14 w-full text-base`}>
        {t.signInProd.toDemo}
      </Link>
    </div>
  );
}
