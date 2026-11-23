import { describe, expect, it } from 'vitest';
import {
  canMoveDeclaration,
  canSeeDeclaration,
  declarationInputSchema,
  declarationValue,
  shortShelfLife,
  type ImportDeclaration,
} from './declaration';
import { allowedNext } from './audit';
import { DECLARATION_TRANSITIONS } from './declaration';
import type { Session } from './roles';

const line = {
  productName: 'Amoxil',
  inn: 'Amoxicilline',
  dosageForm: 'CAPSULE' as const,
  strength: '500 mg',
  hsCode: '300410',
  ammNumber: 'AMM-1234',
  manufacturer: 'Lab X',
  originCountry: 'IN',
  batchNumber: 'B1',
  expiryDate: '2028-06-30',
  quantity: 100,
  unit: 'boîte de 20',
  unitPrice: 2.5,
};
const input = {
  mode: 'SEA' as const,
  entryPoint: 'MATADI' as const,
  transportDocument: 'BL123',
  carrier: 'Maersk',
  shipmentCountry: 'IN',
  supplier: 'Supplier',
  expectedArrival: '2026-12-15',
  currency: 'USD' as const,
  lines: [line],
};

const decl = (over: Partial<ImportDeclaration> = {}): ImportDeclaration => ({
  id: 'd1',
  reference: 'DI-2026-000001',
  importerId: 'e1',
  importerName: 'Importer',
  destinationProvince: 'CD-KN',
  ...input,
  status: 'SUBMITTED',
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
  history: [],
  ...over,
});

const importer: Session = { userId: 'u1', name: 'I', role: 'OPERATOR', establishmentId: 'e1' };
const otherImporter: Session = { userId: 'u2', name: 'O', role: 'OPERATOR', establishmentId: 'e2' };
const officer: Session = { userId: 'u3', name: 'R', role: 'IMPORT_OFFICER' };
const inspector: Session = { userId: 'u4', name: 'S', role: 'INSPECTOR' };
const leader: Session = { userId: 'u5', name: 'L', role: 'LEADERSHIP' };
const provincial: Session = { userId: 'u6', name: 'P', role: 'PROVINCIAL_OFFICER', province: 'CD-HK' };

describe('declarationInputSchema', () => {
  it('accepts a valid declaration', () => {
    expect(declarationInputSchema.safeParse(input).success).toBe(true);
  });
  it('rejects an airport for a sea shipment', () => {
    const r = declarationInputSchema.safeParse({ ...input, entryPoint: 'FIH' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('entry_mode_mismatch');
  });
  it('rejects products expiring before arrival', () => {
    const r = declarationInputSchema.safeParse({ ...input, lines: [{ ...line, expiryDate: '2026-12-01' }] });
    expect(r.error?.issues.map((i) => i.message)).toContain('expired');
  });
  it('requires at least one line and a valid HS code', () => {
    expect(declarationInputSchema.safeParse({ ...input, lines: [] }).error?.issues[0]?.message).toBe('no_lines');
    const r = declarationInputSchema.safeParse({ ...input, lines: [{ ...line, hsCode: '30A' }] });
    expect(r.error?.issues[0]?.message).toBe('hs_format');
  });
});

describe('workflow', () => {
  it('only reviewers decide and only inspectors clear', () => {
    expect(canMoveDeclaration(officer, decl({ status: 'UNDER_REVIEW' }), 'APPROVED')).toBe(true);
    expect(canMoveDeclaration(importer, decl({ status: 'UNDER_REVIEW' }), 'APPROVED')).toBe(false);
    expect(canMoveDeclaration(inspector, decl({ status: 'APPROVED' }), 'CLEARED')).toBe(true);
    expect(canMoveDeclaration(officer, decl({ status: 'APPROVED' }), 'CLEARED')).toBe(false);
  });
  it('lets the importer answer a request for information, but not another importer', () => {
    expect(canMoveDeclaration(importer, decl({ status: 'INFO_REQUESTED' }), 'SUBMITTED')).toBe(true);
    expect(canMoveDeclaration(otherImporter, decl({ status: 'INFO_REQUESTED' }), 'SUBMITTED')).toBe(false);
  });
  it('has no way out of final statuses', () => {
    for (const s of ['REJECTED', 'CANCELLED', 'CLEARED', 'NON_COMPLIANT'] as const) {
      expect(allowedNext(DECLARATION_TRANSITIONS, 'REVIEWER', s)).toEqual([]);
    }
  });
});

describe('visibility', () => {
  it('keeps drafts private and scopes provincial officers', () => {
    expect(canSeeDeclaration(officer, decl({ status: 'DRAFT' }))).toBe(false);
    expect(canSeeDeclaration(importer, decl({ status: 'DRAFT' }))).toBe(true);
    expect(canSeeDeclaration(otherImporter, decl())).toBe(false);
    expect(canSeeDeclaration(leader, decl())).toBe(true);
    expect(canSeeDeclaration(provincial, decl())).toBe(false);
    expect(canSeeDeclaration(provincial, decl({ destinationProvince: 'CD-HK' }))).toBe(true);
  });
});

describe('helpers', () => {
  it('computes value and shelf life', () => {
    expect(declarationValue(input)).toBe(250);
    expect(shortShelfLife({ expiryDate: '2027-06-01' }, '2026-12-15')).toBe(true);
    expect(shortShelfLife({ expiryDate: '2028-06-01' }, '2026-12-15')).toBe(false);
  });
});
