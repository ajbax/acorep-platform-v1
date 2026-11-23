import { describe, expect, it } from 'vitest';
import { PROVINCE_CODES } from '@acorep/shared';
import { classBreaks, classOf } from './DrcMap';
import { PROVINCE_SHAPES } from './drcShapes';

describe('map', () => {
  it('has a shape for every province', () => {
    for (const code of PROVINCE_CODES) expect(PROVINCE_SHAPES[code].d.length).toBeGreaterThan(50);
  });

  it('puts zero in the empty class and keeps outliers from flattening the rest', () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 140];
    const breaks = classBreaks(values);
    expect(classOf(0, breaks)).toBe(0);
    expect(classOf(1, breaks)).toBe(1);
    expect(classOf(140, breaks)).toBe(5);
    // Mid values land in distinct middle classes, not all in class 1.
    expect(new Set([2, 4, 6, 8].map((v) => classOf(v, breaks))).size).toBeGreaterThan(2);
  });
});
