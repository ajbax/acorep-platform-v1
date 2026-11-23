import {
  buildDeclaration,
  buildEstablishment,
  canRegisterEstablishment,
  canSeeDeclaration,
  declarationInputSchema,
  establishmentInputSchema,
  formatReference,
  reviseDeclaration,
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
import { buildSeed, PRODUCTS } from './seed';

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
  // Seeded records, then every stored one: changed seeds and records created in this browser.
  const establishments = new Map(seed.establishments.map((e) => [e.id, e]));
  for (const e of Object.values(stored.establishments)) establishments.set(e.id, e);
  const declarations = new Map(seed.declarations.map((d) => [d.id, d]));
  for (const d of Object.values(stored.declarations)) declarations.set(d.id, d);

  const putEstablishment = (e: Establishment) => {
    establishments.set(e.id, e);
    stored.establishments[e.id] = e;
    save(stored);
  };
  const putDeclaration = (d: ImportDeclaration) => {
    declarations.set(d.id, d);
    stored.declarations[d.id] = d;
    save(stored);
  };
  const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  /** Next DI-YYYY-NNNNNN for the current year (the API uses an atomic counter). */
  const nextReference = (now: Date) => {
    const year = now.getFullYear();
    const max = Math.max(
      0,
      ...[...declarations.values()]
        .filter((d) => d.reference.startsWith(`DI-${year}-`))
        .map((d) => Number(d.reference.slice(-6))),
    );
    return formatReference(year, max + 1);
  };

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
        putEstablishment(next);
        return establishmentView(s, next);
      }),
    registerEstablishment: (raw, account) =>
      wrap(() => {
        const s = getSession();
        const parsed = establishmentInputSchema.safeParse(raw);
        if (!parsed.success) throw new WorkflowError('invalid');
        const input = parsed.data;
        if (!canRegisterEstablishment(s, input.province)) throw new WorkflowError('forbidden');
        if (!s && !account) throw new WorkflowError('invalid');
        const id = newId('est');
        const userId = s?.userId ?? newId('u');
        const by = s
          ? { userId: s.userId, name: s.name, role: s.role }
          : { userId, name: account!.name, role: 'OPERATOR' as const };
        const establishment = buildEstablishment(input, { id, now: new Date(), by });
        putEstablishment(establishment);
        const session: Session | undefined = s
          ? undefined
          : { userId, name: input.legalName, role: 'OPERATOR', establishmentId: id };
        return { establishment, session };
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
        putDeclaration(next);
        return next;
      }),
    createDeclaration: (raw, opts) =>
      wrap(() => {
        const s = session();
        const parsed = declarationInputSchema.safeParse(raw);
        if (!parsed.success) throw new WorkflowError('invalid');
        const importer = s.establishmentId ? establishments.get(s.establishmentId) : undefined;
        if (!importer) throw new WorkflowError('forbidden');
        const now = new Date();
        const d = buildDeclaration(s, importer, parsed.data, {
          id: newId('dec'),
          reference: nextReference(now),
          now,
          ...opts,
        });
        putDeclaration(d);
        return d;
      }),
    updateDeclaration: (id, raw, opts) =>
      wrap(() => {
        const s = session();
        const parsed = declarationInputSchema.safeParse(raw);
        if (!parsed.success) throw new WorkflowError('invalid');
        const d = declarations.get(id);
        if (!d) throw new WorkflowError('not_found');
        const next = reviseDeclaration(s, d, parsed.data, { now: new Date(), ...opts });
        putDeclaration(next);
        return next;
      }),

    listProducts: () =>
      wrap(() => {
        session();
        return PRODUCTS.map(({ unitPrice: _price, ...p }) => p);
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
