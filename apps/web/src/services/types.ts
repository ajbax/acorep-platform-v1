import type {
  DeclarationInput,
  DeclarationStatus,
  Establishment,
  EstablishmentInput,
  EstablishmentStatus,
  ImportDeclaration,
  MoveRequest,
  NationalStats,
  ProductReference,
  Session,
} from '@acorep/shared';

/**
 * The only way components reach data. `mock` (in-browser demo data) and `http` (API Gateway)
 * implement it. Every call is made as the signed-in user; failures reject with an API error code.
 */
export interface DataService {
  listEstablishments(): Promise<Establishment[]>;
  getEstablishment(id: string): Promise<Establishment>;
  moveEstablishment(id: string, req: MoveRequest<EstablishmentStatus>): Promise<Establishment>;
  /**
   * Registers an establishment. Signed out, this is a self-registration: the account is created
   * with it and `session` is returned (production: Cognito sign-up with e-mail, password and MFA).
   * Signed in, staff register on the establishment's behalf.
   */
  registerEstablishment(
    input: EstablishmentInput,
    account?: { name: string; email: string },
  ): Promise<{ establishment: Establishment; session?: Session }>;

  listDeclarations(): Promise<ImportDeclaration[]>;
  getDeclaration(id: string): Promise<ImportDeclaration>;
  moveDeclaration(id: string, req: MoveRequest<DeclarationStatus>): Promise<ImportDeclaration>;
  /** Creates a declaration for the operator's establishment, as a draft or submitted. */
  createDeclaration(input: DeclarationInput, opts: { submit: boolean; attested: boolean }): Promise<ImportDeclaration>;
  /** Edits a draft or a declaration waiting for information, optionally (re)submitting it. */
  updateDeclaration(
    id: string,
    input: DeclarationInput,
    opts: { submit: boolean; attested: boolean; expected: DeclarationStatus; comment?: string },
  ): Promise<ImportDeclaration>;

  /** National register of marketing authorisations (AMM), to prefill product lines. */
  listProducts(): Promise<ProductReference[]>;

  /** Aggregates for the national dashboard over the last 12 months. */
  nationalStats(): Promise<NationalStats>;
}
