import { WorkflowError, type StatusEvent } from './audit';
import {
  IMPORTING_KINDS,
  type Establishment,
  type EstablishmentInput,
  type EstablishmentStatus,
} from './establishment';
import {
  declarationActor,
  EDITABLE_STATUSES,
  type DeclarationInput,
  type DeclarationStatus,
  type ImportDeclaration,
} from './declaration';
import { effectiveEstablishmentStatus } from './establishment';
import type { Session } from './roles';

/**
 * Creating and editing records, shared by the mock and the API Lambda. Inputs must already have
 * passed the matching Zod schema. Throw WorkflowError with an API error code.
 */

/** Who may register an establishment: anyone signing up (no session yet), an admin, or a provincial officer for their own province. */
export function canRegisterEstablishment(s: Session | null, province: Establishment['province']): boolean {
  if (!s) return true;
  if (s.role === 'ADMIN') return true;
  return s.role === 'PROVINCIAL_OFFICER' && s.province === province;
}

/** Staff roles that see the "register an establishment" action. */
export const canRegisterAny = (s: Session | null) => !s || s.role === 'ADMIN' || s.role === 'PROVINCIAL_OFFICER';

export function buildEstablishment(
  input: EstablishmentInput,
  ctx: { id: string; now: Date; by: StatusEvent<EstablishmentStatus>['by'] },
): Establishment {
  const at = ctx.now.toISOString();
  return {
    ...input,
    id: ctx.id,
    status: 'SUBMITTED',
    createdAt: at,
    updatedAt: at,
    history: [{ at, by: ctx.by, from: null, to: 'SUBMITTED' }],
  };
}

/** Error codes for declaring: the importer's establishment must be an importing kind with a valid licence. */
export type DeclareErrorCode = 'not_importer' | 'not_active';

export function declareError(s: Session, importer: Establishment, now = new Date()): DeclareErrorCode | null {
  if (s.role !== 'OPERATOR' || s.establishmentId !== importer.id || !IMPORTING_KINDS.includes(importer.kind)) {
    return 'not_importer';
  }
  return effectiveEstablishmentStatus(importer, now) === 'ACTIVE' ? null : 'not_active';
}

export function formatReference(year: number, n: number) {
  return `DI-${year}-${String(n).padStart(6, '0')}`;
}

/**
 * A new declaration, as a draft or submitted at once. `attested` is the importer's certification
 * that the content is accurate; it is required to submit.
 */
export function buildDeclaration(
  s: Session,
  importer: Establishment,
  input: DeclarationInput,
  ctx: { id: string; reference: string; now: Date; submit: boolean; attested: boolean },
): ImportDeclaration {
  const code = declareError(s, importer, ctx.now);
  if (code) throw new WorkflowError(code === 'not_importer' ? 'forbidden' : 'not_active');
  if (ctx.submit && !ctx.attested) throw new WorkflowError('attestation_required');
  const at = ctx.now.toISOString();
  const by = { userId: s.userId, name: s.name, role: s.role };
  const history: StatusEvent<DeclarationStatus>[] = [{ at, by, from: null, to: 'DRAFT' }];
  if (ctx.submit) history.push({ at, by, from: 'DRAFT', to: 'SUBMITTED' });
  return {
    ...input,
    id: ctx.id,
    reference: ctx.reference,
    importerId: importer.id,
    importerName: importer.legalName,
    destinationProvince: importer.province,
    status: ctx.submit ? 'SUBMITTED' : 'DRAFT',
    ...(ctx.submit ? { submittedAt: at, attestedAt: at } : {}),
    createdAt: at,
    updatedAt: at,
    history,
  };
}

/**
 * The importer edits a draft or answers a request for information. With `submit`, the declaration
 * goes (back) to SUBMITTED in the same step.
 */
export function reviseDeclaration(
  s: Session,
  d: ImportDeclaration,
  input: DeclarationInput,
  ctx: { now: Date; submit: boolean; attested: boolean; expected: DeclarationStatus; comment?: string },
): ImportDeclaration {
  if (declarationActor(s, d) !== 'IMPORTER') throw new WorkflowError('not_found');
  if (d.status !== ctx.expected) throw new WorkflowError('changed');
  if (!EDITABLE_STATUSES.includes(d.status)) throw new WorkflowError('forbidden');
  if (ctx.submit && !ctx.attested) throw new WorkflowError('attestation_required');
  const at = ctx.now.toISOString();
  const next: ImportDeclaration = { ...d, ...input, updatedAt: at };
  if (ctx.submit) {
    const comment = ctx.comment?.trim();
    next.status = 'SUBMITTED';
    next.attestedAt = at;
    next.submittedAt ??= at;
    next.history = [
      ...d.history,
      {
        at,
        by: { userId: s.userId, name: s.name, role: s.role },
        from: d.status,
        to: 'SUBMITTED',
        ...(comment ? { comment } : {}),
      },
    ];
  }
  return next;
}
