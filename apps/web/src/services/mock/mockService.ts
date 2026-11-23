import {
  canSeeDeclaration,
  canSeeEstablishment,
  establishmentView,
  moveDeclaration,
  moveEstablishment,
  nationalStats,
  WorkflowError,
  type Establishment,
  type ImportDeclaration,
  type Session,
} from '@acorep/shared';
import type { DataService } from '../types';
import { buildSeed } from './seed';

/**
 * In-browser implementation of DataService. Rebuilds the seed on every load (dates relative to
 * now), then re-applies changed records stored in localStorage. To reset the demo, clear the
 * `acorep.mock.v1` key. Applies the same shared rules as the API: visibility, workflow, views.
 */
const STORAGE_KEY = 'acorep.mock.v1';

interface Stored {
  establishments: Record<string, Establishment>;
  declarations: Record<string, ImportDeclaration>;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    /* corrupted or unavailable: start fresh */
  }
  return { establishments: {}, declarations: {} };
}

function save(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or unavailable: changes last until reload */
  }
}

const delay = <T>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), 120));

export function createMockService(getSession: () => Session | null): DataService {
  const seed = buildSeed();
  const stored = load();
  const establishments = new Map(seed.establishments.map((e) => [e.id, stored.establishments[e.id] ?? e]));
  const declarations = new Map(seed.declarations.map((d) => [d.id, stored.declarations[d.id] ?? d]));

  const session = () => {
    const s = getSession();
    if (!s) throw new WorkflowError('unauthenticated');
    return s;
  };
  const wrap = async <T>(fn: () => T): Promise<T> => {
    try {
      return await delay(fn());
    } catch (e) {
      // Same shape as the http service: reject with the error code as message.
      throw new Error(e instanceof WorkflowError ? e.code : 'unknown');
    }
  };

  return {
    listEstablishments: () =>
      wrap(() => {
        const s = session();
        return [...establishments.values()]
          .filter((e) => canSeeEstablishment(s, e))
          .map((e) => establishmentView(s, e));
      }),
    getEstablishment: (id) =>
      wrap(() => {
        const s = session();
        const e = establishments.get(id);
        if (!e || !canSeeEstablishment(s, e)) throw new WorkflowError('not_found');
        return establishmentView(s, e);
      }),
    moveEstablishment: (id, req) =>
      wrap(() => {
        const s = session();
        const e = establishments.get(id);
        if (!e) throw new WorkflowError('not_found');
        const next = moveEstablishment(s, e, req);
        establishments.set(id, next);
        stored.establishments[id] = next;
        save(stored);
        return establishmentView(s, next);
      }),

    listDeclarations: () =>
      wrap(() => {
        const s = session();
        return [...declarations.values()].filter((d) => canSeeDeclaration(s, d));
      }),
    getDeclaration: (id) =>
      wrap(() => {
        const s = session();
        const d = declarations.get(id);
        if (!d || !canSeeDeclaration(s, d)) throw new WorkflowError('not_found');
        return d;
      }),
    moveDeclaration: (id, req) =>
      wrap(() => {
        const s = session();
        const d = declarations.get(id);
        if (!d) throw new WorkflowError('not_found');
        const next = moveDeclaration(s, d, req);
        declarations.set(id, next);
        stored.declarations[id] = next;
        save(stored);
        return next;
      }),

    nationalStats: () =>
      wrap(() => {
        const s = session();
        if (s.role === 'OPERATOR') throw new WorkflowError('forbidden');
        const since = new Date();
        since.setFullYear(since.getFullYear() - 1);
        // Provincial officers get national aggregates too: counts only, no personal data.
        return nationalStats([...establishments.values()], [...declarations.values()], since);
      }),
  };
}
