import { describe, expect, it } from 'vitest';
import { moveDeclaration, moveEstablishment } from './workflow';
import type { Establishment } from './establishment';
import type { ImportDeclaration } from './declaration';
import type { Session } from './roles';

const now = new Date('2026-11-22T10:00:00Z');
const officer: Session = { userId: 'u1', name: 'Agent', role: 'IMPORT_OFFICER' };
const provincial: Session = { userId: 'u2', name: 'Prov', role: 'PROVINCIAL_OFFICER', province: 'CD-KN' };

const decl = {
  id: 'd1',
  status: 'UNDER_REVIEW',
  destinationProvince: 'CD-KN',
  importerId: 'e1',
  history: [],
} as unknown as ImportDeclaration;

const est = { id: 'est-abc123', status: 'UNDER_REVIEW', province: 'CD-KN', history: [] } as unknown as Establishment;

describe('moveDeclaration', () => {
  it('records the decision with author and date', () => {
    const d = moveDeclaration(officer, decl, { to: 'APPROVED', expected: 'UNDER_REVIEW' }, now);
    expect(d.status).toBe('APPROVED');
    expect(d.decidedAt).toBe(now.toISOString());
    expect(d.history).toEqual([
      {
        at: now.toISOString(),
        by: { userId: 'u1', name: 'Agent', role: 'IMPORT_OFFICER' },
        from: 'UNDER_REVIEW',
        to: 'APPROVED',
      },
    ]);
  });
  it('requires a comment to reject', () => {
    expect(() => moveDeclaration(officer, decl, { to: 'REJECTED', expected: 'UNDER_REVIEW' }, now)).toThrow(
      'comment_required',
    );
    expect(() =>
      moveDeclaration(officer, decl, { to: 'REJECTED', expected: 'UNDER_REVIEW', comment: '  ' }, now),
    ).toThrow('comment_required');
  });
  it('refuses a stale decision and unauthorised roles', () => {
    expect(() => moveDeclaration(officer, decl, { to: 'APPROVED', expected: 'SUBMITTED' }, now)).toThrow('changed');
    expect(() => moveDeclaration(provincial, decl, { to: 'APPROVED', expected: 'UNDER_REVIEW' }, now)).toThrow(
      'forbidden',
    );
  });
});

describe('moveEstablishment', () => {
  it('issues a licence on approval', () => {
    const e = moveEstablishment(provincial, est, { to: 'ACTIVE', expected: 'UNDER_REVIEW' }, now);
    expect(e.licence?.number).toBe('LIC-2026-ABC123');
    expect(e.licence?.expiresAt.startsWith('2031-11-22')).toBe(true);
  });
  it('hides other provinces as not found', () => {
    const hk: Session = { ...provincial, province: 'CD-HK' };
    expect(() => moveEstablishment(hk, est, { to: 'ACTIVE', expected: 'UNDER_REVIEW' }, now)).toThrow('not_found');
  });
});
