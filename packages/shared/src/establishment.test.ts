import { describe, expect, it } from 'vitest';
import {
  canMoveEstablishment,
  effectiveEstablishmentStatus,
  establishmentInputSchema,
  establishmentView,
  type Establishment,
} from './establishment';
import { PROVINCES } from './geo';
import { nationalStats } from './stats';
import type { Session } from './roles';

const est = (over: Partial<Establishment> = {}): Establishment => ({
  id: 'e1',
  kind: 'PHARMACY',
  legalName: 'Pharmacie du Centre',
  rccm: 'CD/KNG/RCCM/23-B-01234',
  idNat: '01-83-N12345',
  nif: 'A1234567B',
  province: 'CD-KN',
  city: 'Kinshasa',
  address: '12, avenue du Commerce',
  pharmacist: { name: 'Dr A', orderNumber: 'CNOP-1', phone: '+243810000000', email: 'a@b.cd' },
  contact: { phone: '+243810000001' },
  status: 'ACTIVE',
  licence: { number: 'L1', issuedAt: '2024-01-01', expiresAt: '2029-01-01' },
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  history: [],
  ...over,
});

describe('establishments', () => {
  it('lists the 26 provinces once each', () => {
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(26);
  });

  it('derives EXPIRED from the licence end date', () => {
    const e = est({ licence: { number: 'L1', issuedAt: '2020-01-01', expiresAt: '2025-01-01' } });
    expect(effectiveEstablishmentStatus(e, new Date('2026-11-22'))).toBe('EXPIRED');
    expect(effectiveEstablishmentStatus(est(), new Date('2026-11-22'))).toBe('ACTIVE');
  });

  it('lets a provincial officer review only their own province', () => {
    const kin: Session = { userId: 'p', name: 'P', role: 'PROVINCIAL_OFFICER', province: 'CD-KN' };
    const hk: Session = { ...kin, province: 'CD-HK' };
    expect(canMoveEstablishment(kin, est({ status: 'UNDER_REVIEW' }), 'ACTIVE')).toBe(true);
    expect(canMoveEstablishment(hk, est({ status: 'UNDER_REVIEW' }), 'ACTIVE')).toBe(false);
  });

  it('hides contact details from leadership', () => {
    const v = establishmentView({ userId: 'l', name: 'L', role: 'LEADERSHIP' }, est());
    expect(v.pharmacist.phone).toBe('');
    expect(v.pharmacist.email).toBeUndefined();
    expect(v.contact.phone).toBe('');
  });

  it('validates RCCM and phone formats', () => {
    const { id: _id, status: _s, history: _h, createdAt: _c, updatedAt: _u, licence: _l, ...input } = est();
    expect(establishmentInputSchema.safeParse(input).success).toBe(true);
    expect(establishmentInputSchema.safeParse({ ...input, rccm: '123' }).error?.issues[0]?.message).toBe('rccm_format');
    const badPhone = { ...input, contact: { phone: '0810000000' } };
    expect(establishmentInputSchema.safeParse(badPhone).error?.issues[0]?.message).toBe('phone_format');
  });

  it('counts active establishments and expired licences per province', () => {
    const now = new Date('2026-11-22');
    const s = nationalStats(
      [est(), est({ id: 'e2', licence: { number: 'L', issuedAt: '2019-01-01', expiresAt: '2024-01-01' } })],
      [],
      new Date('2026-01-01'),
      now,
    );
    expect(s.provinces['CD-KN'].active.PHARMACY).toBe(1);
    expect(s.provinces['CD-KN'].expiredLicences).toBe(1);
  });
});
