import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { haptic } from '@/lib/haptics';

/**
 * Form controls in the Pic'KG style: filled grey fields that turn white with an ink border on
 * focus. The border shows focus, so the global focus outline is turned off on them.
 */
export const inputClass =
  'w-full rounded-2xl border-2 border-transparent bg-surface px-4 py-3 text-[15px] font-medium text-ink outline-none transition-colors placeholder:text-zinc-400 focus:border-ink focus:bg-white focus-visible:outline-none';
const errorRing = 'border-red-500 bg-red-50/40';

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  optional,
  optionalLabel,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  /** Already-translated error message. */
  error?: string;
  optional?: boolean;
  /** Text shown next to optional fields ("facultatif"). */
  optionalLabel?: string;
  children: ReactNode;
}) {
  const errId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-2 flex items-baseline gap-1.5 text-sm font-bold">
        {label}
        {optional && <span className="text-xs font-medium text-ink-soft">{optionalLabel}</span>}
      </label>
      {children}
      {error ? (
        <motion.p
          id={errId}
          initial={{ x: -6 }}
          animate={{ x: 0 }}
          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-700"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </motion.p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

export function TextField({
  id,
  value,
  onChange,
  invalid,
  className = '',
  ...rest
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  className?: string;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email';
  autoComplete?: string;
  min?: string;
  max?: string;
  list?: string;
  maxLength?: number;
}) {
  return (
    <input
      id={id}
      value={value}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} ${invalid ? errorRing : ''} ${className}`}
      {...rest}
    />
  );
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  invalid,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} cursor-pointer appearance-none pr-10 ${value ? '' : 'text-zinc-400'} ${invalid ? errorRing : ''}`}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        aria-hidden
      />
    </div>
  );
}

/** Input with a fixed prefix shown inside the field (dial code, currency). */
export function PrefixField({
  id,
  prefix,
  value,
  onChange,
  invalid,
  ...rest
}: {
  id: string;
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel';
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-ink-soft">
        {prefix}
      </span>
      <input
        id={id}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pl-[calc(1rem+var(--pw))] ${invalid ? errorRing : ''}`}
        style={{ ['--pw' as string]: `${prefix.length * 0.62 + 0.6}em` }}
        {...rest}
      />
    </div>
  );
}

export function TextArea({
  id,
  value,
  onChange,
  rows = 4,
  invalid,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} resize-y ${invalid ? errorRing : ''}`}
    />
  );
}

/** Two-to-four option toggle. Plain background swap, no layoutId (safe anywhere). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-surface p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              haptic();
              onChange(o.value);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
              on ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Large selectable card (kind of establishment, point of entry…). */
export function ChoiceCard({
  selected,
  onSelect,
  icon: Icon,
  tone = 'bg-surface text-ink',
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  tone?: string;
  title: string;
  body?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        haptic();
        onSelect();
      }}
      className={`relative flex w-full items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition-all ${
        selected ? 'border-ink bg-white shadow-card' : 'border-transparent bg-surface hover:bg-line/70'
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight text-ink">{title}</span>
        {body && <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{body}</span>}
      </span>
      <span
        aria-hidden
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors ${
          selected ? 'bg-ink text-white' : 'border-2 border-line bg-white'
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  children,
  invalid,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  invalid?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 text-sm leading-relaxed transition-colors ${
        invalid ? 'border-red-500 bg-red-50/40' : checked ? 'border-ink bg-white' : 'border-transparent bg-surface'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          haptic();
          onChange(e.target.checked);
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
          checked ? 'bg-ink text-white' : 'border-2 border-zinc-300 bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="font-medium text-ink">{children}</span>
    </label>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
  form,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  form?: string;
}) {
  return (
    <motion.button
      type={type}
      form={form}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={() => {
        haptic(12);
        onClick?.();
      }}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-base font-bold text-white shadow-lg shadow-ink/15 transition-colors hover:bg-[#13264a] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={() => {
        haptic();
        onClick?.();
      }}
      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-surface px-5 text-base font-bold text-ink transition-colors hover:bg-line disabled:opacity-50"
    >
      {children}
    </motion.button>
  );
}

/** Section of a form step: title + short helper text. */
export function StepSection({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        {body && <p className="mt-1 text-sm text-ink-soft">{body}</p>}
      </div>
      {children}
    </section>
  );
}
