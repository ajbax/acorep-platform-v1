import { describe, expect, it } from 'vitest';
import { useI18n } from './index';

const NARROW_NBSP = String.fromCharCode(0x202f);
const NBSP = String.fromCharCode(0xa0);

describe('formatters', () => {
  it('never output the narrow no-break space the display font lacks', () => {
    const { money, num } = useI18n();
    expect(money(21000, 'USD')).not.toContain(NARROW_NBSP);
    expect(money(21000, 'USD').startsWith(`21${NBSP}000,00`)).toBe(true);
    expect(num(1234567)).toBe(`1${NBSP}234${NBSP}567`);
  });
});
