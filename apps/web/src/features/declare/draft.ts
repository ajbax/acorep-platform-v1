import {
  declarationInputSchema,
  type Currency,
  type DeclarationInput,
  type DosageForm,
  type EntryPointId,
  type ImportDeclaration,
  type ProductReference,
  type TransportMode,
} from '@acorep/shared';
import { issuesToErrors } from '@/lib/formErrors';

/**
 * Declaration form state, kept as strings while typing. `validateDeclaration()` runs the shared
 * schema; issue paths ("lines.0.hsCode") become error keys and are mapped to steps.
 */
export interface LineDraft {
  /** Stable key for React lists. */
  key: string;
  /** True when filled from the AMM register (shown as a hint). */
  fromRegister: boolean;
  productName: string;
  inn: string;
  dosageForm: DosageForm | '';
  strength: string;
  atcCode: string;
  hsCode: string;
  ammNumber: string;
  gtin: string;
  manufacturer: string;
  originCountry: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export interface DeclarationDraft {
  mode: TransportMode;
  entryPoint: EntryPointId | '';
  transportDocument: string;
  carrier: string;
  expectedArrival: string;
  supplier: string;
  shipmentCountry: string;
  currency: Currency;
  lines: LineDraft[];
  attest: boolean;
  /** Answer to a request for information (resubmission only). */
  response: string;
}

export type DeclareStep = 'transport' | 'origin' | 'products' | 'review';
export const DECLARE_STEPS: DeclareStep[] = ['transport', 'origin', 'products', 'review'];

const STEP_PREFIXES: Record<DeclareStep, string[]> = {
  transport: ['mode', 'entryPoint', 'transportDocument', 'carrier', 'expectedArrival'],
  origin: ['supplier', 'shipmentCountry', 'currency'],
  products: ['lines'],
  review: ['attest', 'response'],
};

let seq = 0;
const newKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export function emptyLine(origin = ''): LineDraft {
  return {
    key: newKey(),
    fromRegister: false,
    productName: '',
    inn: '',
    dosageForm: '',
    strength: '',
    atcCode: '',
    hsCode: '',
    ammNumber: '',
    gtin: '',
    manufacturer: '',
    originCountry: origin,
    batchNumber: '',
    expiryDate: '',
    quantity: '',
    unit: '',
    unitPrice: '',
  };
}

/** A line prefilled from the AMM register; the importer adds batch, expiry, quantity and price. */
export function lineFromRegister(p: ProductReference, origin = ''): LineDraft {
  return {
    ...emptyLine(origin),
    fromRegister: true,
    productName: p.productName,
    inn: p.inn,
    dosageForm: p.dosageForm,
    strength: p.strength,
    atcCode: p.atcCode ?? '',
    hsCode: p.hsCode,
    ammNumber: p.ammNumber,
    unit: p.unit,
  };
}

export function initialDeclarationDraft(existing?: ImportDeclaration): DeclarationDraft {
  if (!existing) {
    return {
      mode: 'SEA',
      entryPoint: '',
      transportDocument: '',
      carrier: '',
      expectedArrival: '',
      supplier: '',
      shipmentCountry: '',
      currency: 'USD',
      lines: [],
      attest: false,
      response: '',
    };
  }
  return {
    mode: existing.mode,
    entryPoint: existing.entryPoint,
    transportDocument: existing.transportDocument,
    carrier: existing.carrier,
    expectedArrival: existing.expectedArrival.slice(0, 10),
    supplier: existing.supplier,
    shipmentCountry: existing.shipmentCountry,
    currency: existing.currency,
    lines: existing.lines.map((l) => ({
      key: newKey(),
      fromRegister: false,
      productName: l.productName,
      inn: l.inn,
      dosageForm: l.dosageForm,
      strength: l.strength,
      atcCode: l.atcCode ?? '',
      hsCode: l.hsCode,
      ammNumber: l.ammNumber,
      gtin: l.gtin ?? '',
      manufacturer: l.manufacturer,
      originCountry: l.originCountry,
      batchNumber: l.batchNumber,
      expiryDate: l.expiryDate.slice(0, 10),
      quantity: String(l.quantity),
      unit: l.unit,
      unitPrice: String(l.unitPrice),
    })),
    attest: false,
    response: '',
  };
}

/** "1 250,50" and "1250.5" both read as 1250.5. Empty or invalid → NaN (the schema reports it). */
export function parseAmount(v: string): number {
  const s = v.replace(/[\s\u202f\u00a0]/g, '').replace(',', '.');
  return s === '' ? NaN : Number(s);
}

const opt = (v: string) => (v.trim() ? v.trim() : undefined);

export function toInput(d: DeclarationDraft): unknown {
  return {
    mode: d.mode,
    entryPoint: d.entryPoint || undefined,
    transportDocument: d.transportDocument,
    carrier: d.carrier,
    shipmentCountry: d.shipmentCountry || undefined,
    supplier: d.supplier,
    expectedArrival: d.expectedArrival,
    currency: d.currency,
    lines: d.lines.map((l) => ({
      productName: l.productName,
      inn: l.inn,
      dosageForm: l.dosageForm || undefined,
      strength: l.strength,
      atcCode: opt(l.atcCode.toUpperCase()),
      hsCode: l.hsCode.replace(/\D/g, ''),
      ammNumber: l.ammNumber,
      gtin: opt(l.gtin),
      manufacturer: l.manufacturer,
      originCountry: l.originCountry || undefined,
      batchNumber: l.batchNumber,
      expiryDate: l.expiryDate,
      quantity: parseAmount(l.quantity),
      unit: l.unit,
      unitPrice: parseAmount(l.unitPrice),
    })),
  };
}

export function lineTotal(l: LineDraft): number {
  const q = parseAmount(l.quantity);
  const p = parseAmount(l.unitPrice);
  return Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
}

/**
 * `forSubmit`: the attestation (and, when answering a request for information, the response)
 * is required. Saving a draft only needs a valid declaration.
 */
export function validateDeclaration(d: DeclarationDraft, opts: { forSubmit: boolean; answering: boolean }) {
  const input = toInput(d);
  const parsed = declarationInputSchema.safeParse(input);
  const errors: Record<string, string> = parsed.success ? {} : issuesToErrors(parsed.error.issues, input);
  if (opts.forSubmit && !d.attest) errors.attest = 'attest';
  if (opts.forSubmit && opts.answering && !d.response.trim()) errors.response = 'required';
  const stepHasErrors = (step: DeclareStep) =>
    Object.keys(errors).some((k) => STEP_PREFIXES[step].some((p) => k === p || k.startsWith(`${p}.`)));
  return { errors, stepHasErrors, input: parsed.success ? (parsed.data as DeclarationInput) : null };
}
