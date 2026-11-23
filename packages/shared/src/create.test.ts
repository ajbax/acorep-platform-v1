import { describe, expect, it } from 'vitest';
import { buildDeclaration, buildEstablishment, canRegisterEstablishment, reviseDeclaration } from './create';
import type { Establishment } from './establishment';
import type { DeclarationInput } from './declaration';
import type { Session } from './roles';

const now = new Date('2026-11-22T10:00:00Z');
const importer = {
  id: 'e1',
  kind: 'IMPORTER',
  legalName: 'Importer SARL',
  province: 'CD-KN',
  status: 'ACTIVE',
  licence: { number: 'L', issuedAt: '2025-01-01', expiresAt: '2030-01-01' },
  history: [],
} as unknown as Establishment;
const op: Session = { userId: 'u1', name: 'Importer SARL', role: 'OPERATOR', establishmentId: 'e1' };
const input = {
  mode: 'AIR',
  entryPoint: 'FIH',
  transportDocument: '071-1',
  carrier: 'X',
  shipmentCountry: 'IN',
  supplier: 'S',
  expectedArrival: '2026-12-01',
  currency: 'USD',
  lines: [],
} as unknown as DeclarationInput;
const ctx = { id: 'd1', reference: 'DI-2026-000001', now, submit: true, attested: true };

describe('establishment registration', () => {
  it('lets anyone sign up, admins register anywhere, provincial officers only in their province', () => {
    expect(canRegisterEstablishment(null, 'CD-KN')).toBe(true);
    expect(canRegisterEstablishment({ userId: 'a', name: 'A', role: 'ADMIN' }, 'CD-KN')).toBe(true);
    const prov: Session = { userId: 'p', name: 'P', role: 'PROVINCIAL_OFFICER', province: 'CD-HK' };
    expect(canRegisterEstablishment(prov, 'CD-HK')).toBe(true);
    expect(canRegisterEstablishment(prov, 'CD-KN')).toBe(false);
    expect(canRegisterEstablishment({ userId: 'i', name: 'I', role: 'IMPORT_OFFICER' }, 'CD-KN')).toBe(false);
  });
  it('starts submitted with a creation event', () => {
    const e = buildEstablishment({} as never, { id: 'x', now, by: { userId: 'u', name: 'N', role: 'OPERATOR' } });
    expect(e.status).toBe('SUBMITTED');
    expect(e.history).toHaveLength(1);
  });
});

describe('declarations', () => {
  it('requires an active importer and an attestation to submit', () => {
    expect(buildDeclaration(op, importer, input, ctx).status).toBe('SUBMITTED');
    expect(() => buildDeclaration(op, { ...importer, kind: 'PHARMACY' }, input, ctx)).toThrow('forbidden');
    expect(() => buildDeclaration(op, { ...importer, status: 'SUSPENDED' }, input, ctx)).toThrow('not_active');
    expect(() => buildDeclaration(op, importer, input, { ...ctx, attested: false })).toThrow('attestation_required');
    const draft = buildDeclaration(op, importer, input, { ...ctx, submit: false, attested: false });
    expect(draft.status).toBe('DRAFT');
    expect(draft.submittedAt).toBeUndefined();
  });

  it('lets the importer answer a request for information and resubmit', () => {
    const d = { ...buildDeclaration(op, importer, input, ctx), status: 'INFO_REQUESTED' as const };
    const next = reviseDeclaration(
      op,
      d,
      { ...input, carrier: 'Y' },
      {
        now,
        submit: true,
        attested: true,
        expected: 'INFO_REQUESTED',
        comment: 'Certificats joints',
      },
    );
    expect(next.carrier).toBe('Y');
    expect(next.status).toBe('SUBMITTED');
    expect(next.history.at(-1)).toMatchObject({
      from: 'INFO_REQUESTED',
      to: 'SUBMITTED',
      comment: 'Certificats joints',
    });
  });

  it('refuses edits once under review, and by other importers', () => {
    const d = { ...buildDeclaration(op, importer, input, ctx), status: 'UNDER_REVIEW' as const };
    const opts = { now, submit: false, attested: false, expected: 'UNDER_REVIEW' as const };
    expect(() => reviseDeclaration(op, d, input, opts)).toThrow('forbidden');
    const other: Session = { ...op, establishmentId: 'e2' };
    expect(() => reviseDeclaration(other, d, input, opts)).toThrow('not_found');
  });
});
