import type { ProvinceCode } from './geo';

/**
 * Who uses the platform. Each role maps to a Cognito group of the same name (lower-case).
 * The API checks the group claim on every request; the web app only uses the role to decide what to show.
 */
export const ROLES = [
  'ADMIN', // ACOREP central administration: everything, user management
  'IMPORT_OFFICER', // Direction Import & Export: reviews import declarations
  'PROVINCIAL_OFFICER', // Provincial division: reviews establishments in one province
  'INSPECTOR', // Inspection at points of entry: clears or blocks approved imports
  'LEADERSHIP', // Direction générale / Ministry: read-only national view
  'OPERATOR', // A registered establishment's own user (importer, pharmacy…)
] as const;
export type Role = (typeof ROLES)[number];

export interface Session {
  userId: string;
  name: string;
  role: Role;
  /** Required for PROVINCIAL_OFFICER: the only province they see. */
  province?: ProvinceCode;
  /** Required for OPERATOR: the establishment they act for. */
  establishmentId?: string;
}

export const isStaff = (s: Session) => s.role !== 'OPERATOR';

/** Roles that may see nominative data (people, contacts, values) for every province. */
export const NATIONAL_ROLES: readonly Role[] = ['ADMIN', 'IMPORT_OFFICER', 'INSPECTOR'];

/** Province-level scope check shared by establishments and declarations. */
export function canSeeProvince(s: Session, province: ProvinceCode): boolean {
  if (NATIONAL_ROLES.includes(s.role) || s.role === 'LEADERSHIP') return true;
  if (s.role === 'PROVINCIAL_OFFICER') return s.province === province;
  return false;
}
