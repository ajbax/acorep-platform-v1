import { z } from 'zod';
import {
  ENTRY_POINT_IDS,
  ENTRY_POINTS,
  TRANSPORT_MODES,
  type EntryPointId,
  type ProvinceCode,
  type TransportMode,
} from './geo';
import { canMove, type StatusEvent, type Transitions } from './audit';
import { canSeeProvince, type Session } from './roles';

/**
 * Import declarations (déclarations d'importation), WHO GBT function "Market surveillance and
 * control" (import control). An importer declares a consignment before it ships; ACOREP's
 * Direction Import & Export reviews it; an inspector clears it at the point of entry.
 */

export const DECLARATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'CLEARED',
  'NON_COMPLIANT',
] as const;
export type DeclarationStatus = (typeof DECLARATION_STATUSES)[number];

/** Statuses waiting on ACOREP (the review queue). */
export const PENDING_STATUSES: readonly DeclarationStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];

export type DeclarationActor = 'IMPORTER' | 'REVIEWER' | 'INSPECTOR';

export const DECLARATION_TRANSITIONS: Transitions<DeclarationStatus, DeclarationActor> = {
  DRAFT: { SUBMITTED: ['IMPORTER'], CANCELLED: ['IMPORTER'] },
  SUBMITTED: { UNDER_REVIEW: ['REVIEWER'], CANCELLED: ['IMPORTER'] },
  UNDER_REVIEW: { INFO_REQUESTED: ['REVIEWER'], APPROVED: ['REVIEWER'], REJECTED: ['REVIEWER'] },
  INFO_REQUESTED: { SUBMITTED: ['IMPORTER'], CANCELLED: ['IMPORTER'] },
  APPROVED: { CLEARED: ['INSPECTOR'], NON_COMPLIANT: ['INSPECTOR'] },
  REJECTED: {},
  CANCELLED: {},
  CLEARED: {},
  NON_COMPLIANT: {},
};

export const DOSAGE_FORMS = [
  'TABLET',
  'CAPSULE',
  'ORAL_SOLUTION',
  'SYRUP',
  'INJECTABLE',
  'INFUSION',
  'POWDER',
  'CREAM',
  'OINTMENT',
  'SUPPOSITORY',
  'DROPS',
  'INHALER',
  'MEDICAL_DEVICE',
  'OTHER',
] as const;
export type DosageForm = (typeof DOSAGE_FORMS)[number];

/** ISO 4217. */
export const CURRENCIES = ['USD', 'EUR', 'CDF'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface ProductLine {
  /** Brand or trade name as on the pack. */
  productName: string;
  /** International Nonproprietary Name (DCI in French). */
  inn: string;
  dosageForm: DosageForm;
  /** e.g. "500 mg", "250 mg/5 ml". */
  strength: string;
  /** WHO ATC code, optional. */
  atcCode?: string;
  /** WCO Harmonized System code (chapter 30 for medicines), 6 to 10 digits. */
  hsCode: string;
  /** DRC marketing authorisation (AMM) number. */
  ammNumber: string;
  /** GS1 GTIN-8/12/13/14, optional. */
  gtin?: string;
  manufacturer: string;
  /** ISO 3166-1 alpha-2. */
  originCountry: string;
  batchNumber: string;
  /** ISO 8601 date. */
  expiryDate: string;
  quantity: number;
  /** Packaging unit, e.g. "boîte de 10". */
  unit: string;
  unitPrice: number;
}

export interface ImportDeclaration {
  id: string;
  /** Human reference, e.g. DI-2026-000123. */
  reference: string;
  importerId: string;
  importerName: string;
  /** Province the goods are delivered to (the importer's warehouse). */
  destinationProvince: ProvinceCode;
  mode: TransportMode;
  entryPoint: EntryPointId;
  /** Bill of lading (sea) or air waybill (air) number. */
  transportDocument: string;
  carrier: string;
  /** ISO 3166-1 alpha-2. */
  shipmentCountry: string;
  supplier: string;
  expectedArrival: string;
  currency: Currency;
  lines: ProductLine[];
  status: DeclarationStatus;
  submittedAt?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
  history: StatusEvent<DeclarationStatus>[];
}

export const declarationValue = (d: Pick<ImportDeclaration, 'lines'>) =>
  d.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

/**
 * Minimum remaining shelf life on arrival, in months. Lines below it are flagged for the reviewer
 * (not blocked). TODO(spec): confirm the national rule.
 */
export const MIN_SHELF_LIFE_MONTHS = 12;

export function shortShelfLife(line: Pick<ProductLine, 'expiryDate'>, arrival: string): boolean {
  const limit = new Date(arrival);
  limit.setMonth(limit.getMonth() + MIN_SHELF_LIFE_MONTHS);
  return new Date(line.expiryDate) < limit;
}

export function declarationActor(s: Session, d: ImportDeclaration): DeclarationActor | null {
  if (s.role === 'OPERATOR') return s.establishmentId === d.importerId ? 'IMPORTER' : null;
  if (s.role === 'ADMIN' || s.role === 'IMPORT_OFFICER') return 'REVIEWER';
  if (s.role === 'INSPECTOR') return 'INSPECTOR';
  return null;
}

export const canMoveDeclaration = (s: Session, d: ImportDeclaration, to: DeclarationStatus) => {
  const actor = declarationActor(s, d);
  return actor !== null && canMove(DECLARATION_TRANSITIONS, actor, d.status, to);
};

export function canSeeDeclaration(s: Session, d: ImportDeclaration): boolean {
  if (s.role === 'OPERATOR') return s.establishmentId === d.importerId;
  // Drafts are private to the importer.
  if (d.status === 'DRAFT') return false;
  return canSeeProvince(s, d.destinationProvince);
}

// ---------- Input validation (declaration form and API) ----------

export type DeclarationErrorCode =
  | 'required'
  | 'positive'
  | 'hs_format'
  | 'gtin_format'
  | 'atc_format'
  | 'country_format'
  | 'date_format'
  | 'expired'
  | 'no_lines'
  | 'entry_mode_mismatch';

const req = z.string().trim().min(1, 'required');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'date_format');
const country = z.string().regex(/^[A-Z]{2}$/, 'country_format');

export const productLineSchema = z.object({
  productName: req,
  inn: req,
  dosageForm: z.enum(DOSAGE_FORMS),
  strength: req,
  atcCode: z
    .string()
    .regex(/^[A-Z]\d{2}[A-Z]{2}\d{2}$/, 'atc_format')
    .optional(),
  hsCode: z.string().regex(/^\d{6,10}$/, 'hs_format'),
  ammNumber: req,
  gtin: z
    .string()
    .regex(/^(\d{8}|\d{12,14})$/, 'gtin_format')
    .optional(),
  manufacturer: req,
  originCountry: country,
  batchNumber: req,
  expiryDate: isoDate,
  quantity: z.number().int('positive').positive('positive'),
  unit: req,
  unitPrice: z.number().nonnegative('positive'),
});

export const declarationInputSchema = z
  .object({
    mode: z.enum(TRANSPORT_MODES),
    entryPoint: z.enum(ENTRY_POINT_IDS),
    transportDocument: req,
    carrier: req,
    shipmentCountry: country,
    supplier: req,
    expectedArrival: isoDate,
    currency: z.enum(CURRENCIES),
    lines: z.array(productLineSchema).min(1, 'no_lines'),
  })
  .superRefine((d, ctx) => {
    if (ENTRY_POINTS.find((e) => e.id === d.entryPoint)?.mode !== d.mode) {
      ctx.addIssue({ code: 'custom', path: ['entryPoint'], message: 'entry_mode_mismatch' });
    }
    d.lines.forEach((l, i) => {
      if (new Date(l.expiryDate) <= new Date(d.expectedArrival)) {
        ctx.addIssue({ code: 'custom', path: ['lines', i, 'expiryDate'], message: 'expired' });
      }
    });
  });
export type DeclarationInput = z.infer<typeof declarationInputSchema>;
