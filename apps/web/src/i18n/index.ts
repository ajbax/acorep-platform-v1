import { fr } from './fr';

export type { Dictionary } from './fr';

/**
 * French-only in V1, but components still go through useI18n() so a second language can be added
 * without touching them. fr-CD gives Congolese French number and date conventions.
 */
const LOCALE = 'fr-CD';

/** Replaces {name} placeholders. Unknown placeholders are left as-is. */
export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const numberFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const compactFmt = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const countryFmt = new Intl.DisplayNames([LOCALE], { type: 'region' });

/**
 * French formats group digits with a narrow no-break space (U+202F). The display font has no
 * glyph for it, so "21 000" rendered as "21000": use the regular no-break space instead.
 */
const nbsp = (s: string) => s.replace(/\u202f/g, '\u00a0');

const helpers = {
  t: fr,
  f: interpolate,
  num: (n: number) => nbsp(numberFmt.format(n)),
  compact: (n: number) => nbsp(compactFmt.format(n)),
  money: (amount: number, currency: string, compact = false) =>
    nbsp(
      new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 2,
      }).format(amount),
    ),
  date: (iso: string) => nbsp(dateFmt.format(new Date(iso))),
  dateTime: (iso: string) => nbsp(dateTimeFmt.format(new Date(iso))),
  /** ISO 3166-1 alpha-2 → French country name. */
  country: (code: string) => {
    try {
      return countryFmt.of(code) ?? code;
    } catch {
      return code;
    }
  },
};

export const useI18n = () => helpers;
