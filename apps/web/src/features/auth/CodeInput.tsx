import { forwardRef, useState } from 'react';

const LENGTH = 6;

/**
 * Six code boxes over one real input. The input (transparent, on top) keeps
 * everything that matters: paste, authenticator autofill (`one-time-code`), the
 * numeric keyboard, and one label for screen readers. The boxes only draw it.
 */
export const CodeInput = forwardRef<
  HTMLInputElement,
  { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean }
>(function CodeInput({ id, value, onChange, invalid, disabled }, ref) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, LENGTH - 1);

  return (
    <div className="relative">
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: LENGTH }, (_, i) => {
          const digit = value[i];
          const current = focused && i === active && !(i === LENGTH - 1 && digit);
          return (
            <div
              key={i}
              className={`font-display grid h-16 place-items-center rounded-2xl border-2 text-[28px] font-extrabold transition-colors ${
                invalid
                  ? 'border-red-500 bg-red-50/60'
                  : current
                    ? 'border-ink bg-white'
                    : digit
                      ? 'border-transparent bg-white ring-1 ring-black/10'
                      : 'border-transparent bg-surface'
              }`}
            >
              {digit ?? (current && <span className="h-7 w-0.5 animate-pulse rounded-full bg-ink" />)}
            </div>
          );
        })}
      </div>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, LENGTH))}
        // Invisible but on top, so taps anywhere on the boxes focus it.
        className="absolute inset-0 h-full w-full cursor-text text-transparent caret-transparent opacity-0 outline-none selection:bg-transparent"
      />
    </div>
  );
});
