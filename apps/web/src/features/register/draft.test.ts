import { describe, expect, it } from 'vitest';
import { initialRegisterDraft, toE164, validateRegister, type RegisterDraft } from './draft';

const filled: RegisterDraft = {
  ...initialRegisterDraft('PHARMACY', 'CD-KN'),
  legalName: 'Pharmacie Test',
  rccm: 'cd/kng/rccm/24-b-01234',
  idNat: '01-83-N12345',
  nif: 'A1234567B',
  city: 'Kinshasa',
  address: '12, avenue du Commerce',
  pharmacistName: 'Dr Test',
  orderNumber: 'CNOP/1234',
  pharmacistPhone: '081 234 5678',
  contactPhone: '+243 99 000 0000',
  accountName: 'Dr Test',
  accountEmail: 'test@example.cd',
  attest: true,
};

describe('registration draft', () => {
  it('normalises DRC phone numbers to E.164', () => {
    expect(toE164('081 234 5678')).toBe('+243812345678');
    expect(toE164('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(toE164('0033612345678')).toBe('+33612345678');
    expect(toE164('')).toBe('');
  });

  it('produces a valid input with the RCCM upper-cased', () => {
    const v = validateRegister(filled, true);
    expect(v.errors).toEqual({});
    expect(v.input?.rccm).toBe('CD/KNG/RCCM/24-B-01234');
  });

  it('maps errors to the step that holds the field', () => {
    const v = validateRegister({ ...filled, kind: '', rccm: '123', pharmacistPhone: '', attest: false }, true);
    expect(v.errors.kind).toBe('required');
    expect(v.errors.rccm).toBe('rccm_format');
    expect(v.stepHasErrors('activity')).toBe(true);
    expect(v.stepHasErrors('identity')).toBe(true);
    expect(v.stepHasErrors('location')).toBe(false);
    expect(v.stepHasErrors('people')).toBe(true);
    expect(v.stepHasErrors('review')).toBe(true);
  });

  it('says "required" for an empty field rather than "wrong format"', () => {
    const v = validateRegister({ ...filled, rccm: '', pharmacistPhone: '' }, true);
    expect(v.errors.rccm).toBe('required');
    expect(v.errors['pharmacist.phone']).toBe('required');
  });

  it('only asks for an account when self-registering', () => {
    const noAccount = { ...filled, accountName: '', accountEmail: '' };
    expect(validateRegister(noAccount, true).stepHasErrors('account')).toBe(true);
    expect(validateRegister(noAccount, false).errors).toEqual({});
  });
});
