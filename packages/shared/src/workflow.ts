import { needsComment, WorkflowError, type MoveRequest, type StatusEvent } from './audit';
import {
  canMoveEstablishment,
  canSeeEstablishment,
  LICENCE_YEARS,
  type Establishment,
  type EstablishmentStatus,
} from './establishment';
import { canMoveDeclaration, canSeeDeclaration, type DeclarationStatus, type ImportDeclaration } from './declaration';
import type { Session } from './roles';

/**
 * Status changes, shared by the mock and the API Lambda. Each returns a new record with the event
 * appended, or throws a WorkflowError with an API error code. The caller persists the result
 * (the API writes it conditionally on the previous status).
 */

function check<S extends string>(current: S, req: MoveRequest<S>, visible: boolean, allowed: boolean): void {
  if (!visible) throw new WorkflowError('not_found');
  if (current !== req.expected) throw new WorkflowError('changed');
  if (!allowed) throw new WorkflowError('forbidden');
  if (needsComment(req.to) && !req.comment?.trim()) throw new WorkflowError('comment_required');
}

function event<S extends string>(s: Session, from: S, req: MoveRequest<S>, now: Date): StatusEvent<S> {
  const comment = req.comment?.trim();
  return {
    at: now.toISOString(),
    by: { userId: s.userId, name: s.name, role: s.role },
    from,
    to: req.to,
    ...(comment ? { comment } : {}),
  };
}

export function moveEstablishment(
  s: Session,
  e: Establishment,
  req: MoveRequest<EstablishmentStatus>,
  now = new Date(),
  /** Licence number generator (the API uses a counter). */
  nextLicenceNumber: () => string = () => `LIC-${now.getFullYear()}-${e.id.slice(-6).toUpperCase()}`,
): Establishment {
  check(e.status, req, canSeeEstablishment(s, e), canMoveEstablishment(s, e, req.to));
  const next: Establishment = {
    ...e,
    status: req.to,
    updatedAt: now.toISOString(),
    history: [...e.history, event(s, e.status, req, now)],
  };
  // Approval issues a new licence; reinstatement after suspension keeps the existing one.
  if (req.to === 'ACTIVE' && e.status === 'UNDER_REVIEW') {
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + LICENCE_YEARS);
    next.licence = { number: nextLicenceNumber(), issuedAt: now.toISOString(), expiresAt: expires.toISOString() };
  }
  return next;
}

export function moveDeclaration(
  s: Session,
  d: ImportDeclaration,
  req: MoveRequest<DeclarationStatus>,
  now = new Date(),
): ImportDeclaration {
  check(d.status, req, canSeeDeclaration(s, d), canMoveDeclaration(s, d, req.to));
  // Submitting carries the importer's attestation: it goes through buildDeclaration / reviseDeclaration.
  if (req.to === 'SUBMITTED') throw new WorkflowError('attestation_required');
  const at = now.toISOString();
  return {
    ...d,
    status: req.to,
    updatedAt: at,
    ...(req.to === 'APPROVED' || req.to === 'REJECTED' ? { decidedAt: at } : {}),
    history: [...d.history, event(s, d.status, req, now)],
  };
}
