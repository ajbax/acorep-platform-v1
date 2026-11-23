import { describe, expect, it } from 'vitest';
import {
  initialDeclarationDraft,
  lineFromRegister,
  lineTotal,
  parseAmount,
  validateDeclaration,
  type DeclarationDraft,
} from './draft';

const product = {
  ammNumber: 'AMM/ACOREP/2023/0412',
  productName: 'Amoxicilline Gé',
  inn: 'Amoxicilline',
  dosageForm: 'CAPSULE' as const,
  strength: '500 mg',
  atcCode: 'J01CA04',
  hsCode: '300410',
  unit: 'boîte de 20',
};

const filled = (): DeclarationDraft => ({
  ...initialDeclarationDraft(),
  mode: 'AIR',
  entryPoint: 'FIH',
  transportDocument: '071-12345678',
  carrier: 'Ethiopian Cargo',
  expectedArrival: '2026-12-15',
  supplier: 'Ganga Lifesciences Ltd',
  shipmentCountry: 'IN',
  lines: [
    {
      ...lineFromRegister(product, 'IN'),
      manufacturer: 'Ganga Lifesciences Ltd',
      batchNumber: 'B1',
      expiryDate: '2028-06-30',
      quantity: '1 000',
      unitPrice: '1,80',
    },
  ],
});

describe('declaration draft', () => {
  it('reads French and English number formats', () => {
    expect(parseAmount('1 250,50')).toBe(1250.5);
    expect(parseAmount('1250.5')).toBe(1250.5);
    expect(parseAmount('')).toBeNaN();
  });

  it('builds a valid input from a register line', () => {
    const v = validateDeclaration(filled(), { forSubmit: false, answering: false });
    expect(v.errors).toEqual({});
    expect(v.input?.lines[0]).toMatchObject({ quantity: 1000, unitPrice: 1.8, originCountry: 'IN' });
    expect(lineTotal(filled().lines[0]!)).toBeCloseTo(1800);
  });

  it('puts line errors on the products step and the attestation on review', () => {
    const d = filled();
    d.lines[0]!.batchNumber = '';
    d.entryPoint = 'MATADI';
    const v = validateDeclaration(d, { forSubmit: true, answering: true });
    expect(v.errors['lines.0.batchNumber']).toBe('required');
    expect(v.errors.entryPoint).toBe('entry_mode_mismatch');
    expect(v.stepHasErrors('transport')).toBe(true);
    expect(v.stepHasErrors('origin')).toBe(false);
    expect(v.stepHasErrors('products')).toBe(true);
    expect(v.errors.attest).toBe('attest');
    expect(v.errors.response).toBe('required');
  });

  it('requires at least one product', () => {
    const v = validateDeclaration({ ...filled(), lines: [] }, { forSubmit: false, answering: false });
    expect(v.errors.lines).toBe('no_lines');
    expect(v.stepHasErrors('products')).toBe(true);
  });
});
