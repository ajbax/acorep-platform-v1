import type { Role, Session } from '@acorep/shared';
import { DEMO_STAFF } from '@/services/mock/seed';

/**
 * Demo sign-in: pick a profile. Production uses Cognito (e-mail + password + TOTP MFA, NIST
 * SP 800-63B AAL2) behind the same `currentSession` / `signIn` / `signOut` surface.
 */
const STORAGE_KEY = 'acorep.session.v1';

export interface DemoProfile {
  id: string;
  session: Session;
}

const staff = (role: Exclude<Role, 'OPERATOR'>): Session => ({ ...DEMO_STAFF[role], role });

/** Descriptions are in the dictionary: t.signIn.profiles[id]. */
export const DEMO_PROFILES: DemoProfile[] = [
  { id: 'admin', session: staff('ADMIN') },
  { id: 'import', session: staff('IMPORT_OFFICER') },
  { id: 'prov', session: staff('PROVINCIAL_OFFICER') },
  { id: 'insp', session: staff('INSPECTOR') },
  { id: 'dg', session: staff('LEADERSHIP') },
  {
    id: 'importer',
    session: {
      userId: 'u-op-1',
      name: 'Fleuve Santé Distribution SARL',
      role: 'OPERATOR',
      establishmentId: 'est-0001',
    },
  },
];

let current: Session | null = read();

function read(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export const currentSession = () => current;

export function setSession(s: Session | null) {
  current = s;
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* memory only */
  }
}
