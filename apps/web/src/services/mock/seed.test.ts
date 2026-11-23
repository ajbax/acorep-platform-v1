import { describe, expect, it } from 'vitest';
import { declarationInputSchema, establishmentInputSchema, PROVINCE_CODES } from '@acorep/shared';
import { buildSeed } from './seed';

describe('demo seed', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  const seed = buildSeed(now);

  it('is deterministic', () => {
    expect(buildSeed(now)).toEqual(seed);
  });

  it('covers every province and links declarations to real importers', () => {
    const provinces = new Set(seed.establishments.map((e) => e.province));
    expect(PROVINCE_CODES.every((p) => provinces.has(p))).toBe(true);
    const ids = new Set(seed.establishments.map((e) => e.id));
    for (const d of seed.declarations) expect(ids.has(d.importerId)).toBe(true);
  });

  it('only contains records that pass the shared input schemas', () => {
    for (const e of seed.establishments) {
      const r = establishmentInputSchema.safeParse(e);
      expect(r.error?.issues ?? [], e.id).toEqual([]);
    }
    for (const d of seed.declarations) {
      // Seeded arrivals can be in the past, which the "expired before arrival" rule doesn't mind.
      const r = declarationInputSchema.safeParse(d);
      expect(r.error?.issues ?? [], d.id).toEqual([]);
    }
  });
});
