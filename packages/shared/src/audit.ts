import type { Role } from './roles';

/** One recorded status change. Events are appended, never edited or deleted. */
export interface StatusEvent<S extends string> {
  at: string; // ISO 8601
  by: { userId: string; name: string; role: Role };
  from: S | null; // null for creation
  to: S;
  comment?: string;
}

/** Status machine description: who may move a record from which status to which. */
export type Transitions<S extends string, A extends string> = Record<S, Partial<Record<S, readonly A[]>>>;

export function allowedNext<S extends string, A extends string>(t: Transitions<S, A>, actor: A, from: S): S[] {
  return (Object.entries(t[from]) as [S, readonly A[]][])
    .filter(([, actors]) => actors.includes(actor))
    .map(([to]) => to);
}

export const canMove = <S extends string, A extends string>(t: Transitions<S, A>, actor: A, from: S, to: S) =>
  t[from][to]?.includes(actor) ?? false;

/** Statuses where the comment is mandatory (the operator must understand what to do). */
export const needsComment = (to: string) =>
  ['INFO_REQUESTED', 'REJECTED', 'NON_COMPLIANT', 'SUSPENDED', 'REVOKED'].includes(to);

/** Error with an API error code (`forbidden`, `not_found`, `changed`, `comment_required`…). */
export class WorkflowError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export interface MoveRequest<S extends string> {
  to: S;
  /** The status the user saw; if it changed meanwhile the move is refused with `changed`. */
  expected: S;
  comment?: string;
}
