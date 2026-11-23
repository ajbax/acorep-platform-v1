import { z } from 'zod';
import { PROVINCE_CODES, type ProvinceCode } from './geo';
import { canMove, type StatusEvent, type Transitions } from './audit';
import { canSeeProvince, NATIONAL_ROLES, type Session } from './roles';

/**
 * Establishments (établissements pharmaceutiques) and their licence, following the WHO Global
 * Benchmarking Tool function "Licensing establishments" (LI).
 */

export const ESTABLISHMENT_KINDS = ['IMPORTER', 'WHOLESALER', 'MANUFACTURER', 'PHARMACY', 'DEPOT'] as const;
export type EstablishmentKind = (typeof ESTABLISHMENT_KINDS)[number];
/** Kinds allowed to file import declarations. */
export const IMPORTING_KINDS: readonly EstablishmentKind[] = ['IMPORTER', 'WHOLESALER', 'MANUFACTURER'];

export const ESTABLISHMENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
  'REVOKED',
  'CLOSED',
] as const;
export type EstablishmentStatus = (typeof ESTABLISHMENT_STATUSES)[number];
/** EXPIRED is never stored: it is derived from the licence end date (see effectiveEstablishmentStatus). */
export type EffectiveEstablishmentStatus = EstablishmentStatus | 'EXPIRED';

export type EstablishmentActor = 'OPERATOR' | 'REVIEWER';

export const ESTABLISHMENT_TRANSITIONS: Transitions<EstablishmentStatus, EstablishmentActor> = {
  DRAFT: { SUBMITTED: ['OPERATOR'] },
  SUBMITTED: { UNDER_REVIEW: ['REVIEWER'] },
  UNDER_REVIEW: { INFO_REQUESTED: ['REVIEWER'], ACTIVE: ['REVIEWER'], REJECTED: ['REVIEWER'] },
  INFO_REQUESTED: { SUBMITTED: ['OPERATOR'] },
  ACTIVE: { SUSPENDED: ['REVIEWER'], REVOKED: ['REVIEWER'], CLOSED: ['OPERATOR', 'REVIEWER'] },
  SUSPENDED: { ACTIVE: ['REVIEWER'], REVOKED: ['REVIEWER'] },
  REJECTED: {},
  REVOKED: {},
  CLOSED: {},
};

/** Licence validity, in years, from the approval date. TODO(spec): confirm with ACOREP. */
export const LICENCE_YEARS = 5;

export interface Establishment {
  id: string;
  kind: EstablishmentKind;
  legalName: string;
  tradeName?: string;
  /** Registre du Commerce et du Crédit Mobilier. */
  rccm: string;
  /** Identification nationale. */
  idNat: string;
  /** Numéro d'impôt. */
  nif: string;
  /** Optional GS1 Global Location Number. */
  gln?: string;
  province: ProvinceCode;
  city: string;
  commune?: string;
  address: string;
  /** WGS 84. */
  location?: { lat: number; lon: number };
  pharmacist: { name: string; orderNumber: string; phone: string; email?: string };
  contact: { phone: string; email?: string };
  status: EstablishmentStatus;
  licence?: { number: string; issuedAt: string; expiresAt: string };
  createdAt: string;
  updatedAt: string;
  history: StatusEvent<EstablishmentStatus>[];
}

export function effectiveEstablishmentStatus(e: Establishment, now = new Date()): EffectiveEstablishmentStatus {
  if (e.status === 'ACTIVE' && e.licence && new Date(e.licence.expiresAt) < now) return 'EXPIRED';
  return e.status;
}

/** Which side of the workflow the session is on for this establishment, or null if it can't act. */
export function establishmentActor(s: Session, e: Establishment): EstablishmentActor | null {
  if (s.role === 'OPERATOR') return s.establishmentId === e.id ? 'OPERATOR' : null;
  if (s.role === 'ADMIN') return 'REVIEWER';
  if (s.role === 'PROVINCIAL_OFFICER' && s.province === e.province) return 'REVIEWER';
  return null;
}

export const canMoveEstablishment = (s: Session, e: Establishment, to: EstablishmentStatus) => {
  const actor = establishmentActor(s, e);
  return actor !== null && canMove(ESTABLISHMENT_TRANSITIONS, actor, e.status, to);
};

export function canSeeEstablishment(s: Session, e: Establishment): boolean {
  if (s.role === 'OPERATOR') return s.establishmentId === e.id;
  return canSeeProvince(s, e.province);
}

/** Leadership sees establishments, but not the people behind them. */
export function establishmentView(s: Session, e: Establishment): Establishment {
  if (s.role === 'OPERATOR' || NATIONAL_ROLES.includes(s.role) || s.role === 'PROVINCIAL_OFFICER') return e;
  return {
    ...e,
    pharmacist: { name: e.pharmacist.name, orderNumber: e.pharmacist.orderNumber, phone: '' },
    contact: { phone: '' },
    history: e.history.map((h) => ({ ...h, comment: undefined })),
  };
}

// ---------- Input validation (registration form and API) ----------

/** Error codes; the web app shows them as t.establishment.errors[code]. */
export type EstablishmentErrorCode =
  'required' | 'rccm_format' | 'phone_format' | 'email_format' | 'gln_format' | 'location_range';

const req = (min = 2) => z.string().trim().min(min, 'required');
/** E.164, DRC numbers or international. */
const phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'phone_format');
const email = z.string().trim().email('email_format');

export const establishmentInputSchema = z.object({
  kind: z.enum(ESTABLISHMENT_KINDS),
  legalName: req(),
  tradeName: z.string().trim().optional(),
  // e.g. CD/KNG/RCCM/23-B-01234
  rccm: z
    .string()
    .trim()
    .regex(/^CD\/[A-Z]{2,4}\/RCCM\/\d{2}-[A-Z]-\d{3,6}$/i, 'rccm_format'),
  idNat: req(),
  nif: req(),
  gln: z
    .string()
    .trim()
    .regex(/^\d{13}$/, 'gln_format')
    .optional(),
  province: z.enum(PROVINCE_CODES),
  city: req(),
  commune: z.string().trim().optional(),
  address: req(5),
  location: z
    .object({ lat: z.number().min(-13.5).max(5.5), lon: z.number().min(12).max(31.5) }, { message: 'location_range' })
    .optional(),
  pharmacist: z.object({ name: req(), orderNumber: req(), phone, email: email.optional() }),
  contact: z.object({ phone, email: email.optional() }),
});
export type EstablishmentInput = z.infer<typeof establishmentInputSchema>;
