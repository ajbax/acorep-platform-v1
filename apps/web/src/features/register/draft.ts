import {
  establishmentInputSchema,
  type EstablishmentInput,
  type EstablishmentKind,
  type ProvinceCode,
} from '@acorep/shared';
import { issuesToErrors } from '@/lib/formErrors';

/**
 * Registration form state, kept as strings while typing. `validate()` runs the shared schema and
 * maps each issue to the step that holds the field, so a step can't be passed with errors on its
 * own fields (same pattern as Pic'KG's post wizard).
 */
export interface RegisterDraft {
  kind: EstablishmentKind | '';
  legalName: string;
  tradeName: string;
  rccm: string;
  idNat: string;
  nif: string;
  gln: string;
  province: ProvinceCode | '';
  city: string;
  commune: string;
  address: string;
  lat: string;
  lon: string;
  pharmacistName: string;
  orderNumber: string;
  pharmacistPhone: string;
  pharmacistEmail: string;
  contactPhone: string;
  contactEmail: string;
  accountName: string;
  accountEmail: string;
  attest: boolean;
}

export type RegisterStep = 'activity' | 'identity' | 'location' | 'people' | 'account' | 'review';

/** The account step only exists for self-registration (no one signed in). */
export const registerSteps = (selfService: boolean): RegisterStep[] =>
  selfService
    ? ['activity', 'identity', 'location', 'people', 'account', 'review']
    : ['activity', 'identity', 'location', 'people', 'review'];

/** Error keys (the schema's issue path, dot-joined) per step. */
const STEP_FIELDS: Record<RegisterStep, string[]> = {
  activity: ['kind', 'legalName', 'tradeName'],
  identity: ['rccm', 'idNat', 'nif', 'gln'],
  location: ['province', 'city', 'commune', 'address', 'location', 'location.lat', 'location.lon'],
  people: [
    'pharmacist.name',
    'pharmacist.orderNumber',
    'pharmacist.phone',
    'pharmacist.email',
    'contact.phone',
    'contact.email',
  ],
  account: ['accountName', 'accountEmail'],
  review: ['attest'],
};

export function initialRegisterDraft(kind?: EstablishmentKind, province?: ProvinceCode): RegisterDraft {
  return {
    kind: kind ?? '',
    legalName: '',
    tradeName: '',
    rccm: '',
    idNat: '',
    nif: '',
    gln: '',
    province: province ?? '',
    city: '',
    commune: '',
    address: '',
    lat: '',
    lon: '',
    pharmacistName: '',
    orderNumber: '',
    pharmacistPhone: '',
    pharmacistEmail: '',
    contactPhone: '',
    contactEmail: '',
    accountName: '',
    accountEmail: '',
    attest: false,
  };
}

/** DRC numbers typed locally ("081 234 5678") become E.164 (+243812345678); "+…" is kept as typed. */
export function toE164(v: string): string {
  const compact = v.replace(/[\s().-]/g, '');
  if (!compact) return '';
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  return `+243${compact.replace(/^0+/, '')}`;
}

const opt = (v: string) => (v.trim() ? v.trim() : undefined);

export function toInput(d: RegisterDraft): unknown {
  const lat = Number(d.lat);
  const lon = Number(d.lon);
  return {
    kind: d.kind || undefined,
    legalName: d.legalName,
    tradeName: opt(d.tradeName),
    rccm: d.rccm.trim().toUpperCase(),
    idNat: d.idNat,
    nif: d.nif,
    gln: opt(d.gln),
    province: d.province || undefined,
    city: d.city,
    commune: opt(d.commune),
    address: d.address,
    location: d.lat && d.lon && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined,
    pharmacist: {
      name: d.pharmacistName,
      orderNumber: d.orderNumber,
      phone: toE164(d.pharmacistPhone),
      email: opt(d.pharmacistEmail),
    },
    contact: { phone: toE164(d.contactPhone), email: opt(d.contactEmail) },
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(d: RegisterDraft, selfService: boolean) {
  const input = toInput(d);
  const parsed = establishmentInputSchema.safeParse(input);
  const errors: Record<string, string> = parsed.success ? {} : issuesToErrors(parsed.error.issues, input);
  if (selfService) {
    if (!d.accountName.trim()) errors.accountName = 'accountName';
    if (!EMAIL.test(d.accountEmail.trim())) errors.accountEmail = 'accountEmail';
  }
  if (!d.attest) errors.attest = 'attest';
  const stepHasErrors = (step: RegisterStep) => STEP_FIELDS[step].some((k) => k in errors);
  return {
    errors,
    stepHasErrors,
    input: parsed.success ? (parsed.data as EstablishmentInput) : null,
  };
}
