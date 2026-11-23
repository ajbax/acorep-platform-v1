import type {
  DeclarationStatus,
  Establishment,
  EstablishmentStatus,
  ImportDeclaration,
  MoveRequest,
  NationalStats,
} from '@acorep/shared';

/**
 * The only way components reach data. `mock` (in-browser demo data) and `http` (API Gateway)
 * implement it. Every call is made as the signed-in user; failures reject with an API error code.
 */
export interface DataService {
  listEstablishments(): Promise<Establishment[]>;
  getEstablishment(id: string): Promise<Establishment>;
  moveEstablishment(id: string, req: MoveRequest<EstablishmentStatus>): Promise<Establishment>;

  listDeclarations(): Promise<ImportDeclaration[]>;
  getDeclaration(id: string): Promise<ImportDeclaration>;
  moveDeclaration(id: string, req: MoveRequest<DeclarationStatus>): Promise<ImportDeclaration>;

  /** Aggregates for the national dashboard over the last 12 months. */
  nationalStats(): Promise<NationalStats>;
}
