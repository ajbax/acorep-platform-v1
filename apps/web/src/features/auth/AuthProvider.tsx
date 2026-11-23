import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session } from '@acorep/shared';
import { currentSession, setSession } from './session';

interface AuthValue {
  session: Session | null;
  signIn: (s: Session) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setState] = useState<Session | null>(currentSession);

  // Data is per user: clear the cache whenever the user changes.
  const signIn = useCallback(
    (s: Session) => {
      setSession(s);
      qc.clear();
      setState(s);
    },
    [qc],
  );
  const signOut = useCallback(() => {
    setSession(null);
    qc.clear();
    setState(null);
  }, [qc]);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Signed-in session, for components rendered under <RequireAuth>. */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('useSession outside <RequireAuth>');
  return session;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to={`/connexion?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}
