import { PROVINCE_CODES, type ProvinceCode, type TransportMode } from './geo';
import { effectiveEstablishmentStatus, type Establishment, type EstablishmentKind } from './establishment';
import { declarationValue, PENDING_STATUSES, type Currency, type ImportDeclaration } from './declaration';

/** Aggregates for the national dashboard. Only counts and totals: no personal data. */

export interface ProvinceStats {
  province: ProvinceCode;
  /** Active, licence-valid establishments by kind. */
  active: Record<EstablishmentKind, number>;
  /** Establishments waiting for a decision (SUBMITTED or UNDER_REVIEW). */
  pendingEstablishments: number;
  /** Licences expired but still marked active. */
  expiredLicences: number;
  /** Declarations delivered to this province within the period, by mode. */
  imports: Record<TransportMode, number>;
  /** Declared value within the period (USD equivalent). */
  importValueUsd: number;
}

export interface NationalStats {
  provinces: Record<ProvinceCode, ProvinceStats>;
  pendingDeclarations: number;
  nonCompliant: number;
  byStatus: Partial<Record<ImportDeclaration['status'], number>>;
}

/** Approximate rates for aggregates only; never shown as an exchange rate. TODO: daily BCC rate. */
export const USD_PER: Record<Currency, number> = { USD: 1, EUR: 1.08, CDF: 1 / 2850 };

const emptyKinds = (): Record<EstablishmentKind, number> => ({
  IMPORTER: 0,
  WHOLESALER: 0,
  MANUFACTURER: 0,
  PHARMACY: 0,
  DEPOT: 0,
});

/** `since`: only declarations submitted on or after this date count toward imports. */
export function nationalStats(
  establishments: Establishment[],
  declarations: ImportDeclaration[],
  since: Date,
  now = new Date(),
): NationalStats {
  const provinces = Object.fromEntries(
    PROVINCE_CODES.map((p) => [
      p,
      {
        province: p,
        active: emptyKinds(),
        pendingEstablishments: 0,
        expiredLicences: 0,
        imports: { SEA: 0, AIR: 0 },
        importValueUsd: 0,
      },
    ]),
  ) as Record<ProvinceCode, ProvinceStats>;

  for (const e of establishments) {
    const s = provinces[e.province];
    const status = effectiveEstablishmentStatus(e, now);
    if (status === 'ACTIVE') s.active[e.kind] += 1;
    else if (status === 'EXPIRED') s.expiredLicences += 1;
    else if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') s.pendingEstablishments += 1;
  }

  const byStatus: NationalStats['byStatus'] = {};
  let pendingDeclarations = 0;
  let nonCompliant = 0;
  for (const d of declarations) {
    if (d.status === 'DRAFT') continue;
    byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
    if (PENDING_STATUSES.includes(d.status)) pendingDeclarations += 1;
    if (d.status === 'NON_COMPLIANT') nonCompliant += 1;
    const counted = d.status === 'APPROVED' || d.status === 'CLEARED';
    if (counted && d.submittedAt && new Date(d.submittedAt) >= since) {
      const s = provinces[d.destinationProvince];
      s.imports[d.mode] += 1;
      s.importValueUsd += declarationValue(d) * USD_PER[d.currency];
    }
  }

  return { provinces, pendingDeclarations, nonCompliant, byStatus };
}

export const totalActive = (s: ProvinceStats) => Object.values(s.active).reduce((a, b) => a + b, 0);
