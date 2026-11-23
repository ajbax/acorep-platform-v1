import type { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { IMPORTING_KINDS } from '@acorep/shared';
import { Shell } from '@/components/Shell';
import { ButtonLink, Loading } from '@/components/ui';
import { useMyEstablishment } from '@/components/nav/groups';
import { RequireAuth, useSession } from '@/features/auth/AuthProvider';
import { SignInPage } from '@/features/auth/SignInPage';
import { ProductionSignInPage } from '@/features/auth/ProductionSignInPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DeclarationsPage } from '@/features/declarations/DeclarationsPage';
import { DeclarationPage } from '@/features/declarations/DeclarationPage';
import { EstablishmentsPage } from '@/features/establishments/EstablishmentsPage';
import { EstablishmentPage } from '@/features/establishments/EstablishmentPage';
import { DeclarePage } from '@/features/declare/DeclarePage';
import { PublicRegisterPage, StaffRegisterPage } from '@/features/register/RegisterPage';
import { AccountPage } from '@/features/account/AccountPage';
import { useI18n } from '@/i18n';

/** Staff land on the national view; operators on their declarations (importers) or their establishment. */
function Home() {
  const s = useSession();
  const mine = useMyEstablishment(s);
  if (s.role !== 'OPERATOR') return <DashboardPage />;
  if (mine.isPending) return <Loading />;
  const importer = mine.data && IMPORTING_KINDS.includes(mine.data.kind);
  return <Navigate to={importer ? '/declarations' : `/etablissements/${s.establishmentId}`} replace />;
}

function StaffOnly({ children }: { children: ReactNode }) {
  const s = useSession();
  return s.role === 'OPERATOR' ? <Navigate to="/" replace /> : <>{children}</>;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="py-24 text-center">
      <p className="font-display text-6xl font-extrabold">404</p>
      <p className="mt-3 text-lg font-semibold text-ink-soft">{t.app.notFound}</p>
      <ButtonLink to="/" className="mt-6">
        {t.app.backHome}
      </ButtonLink>
    </div>
  );
}

/** One layout for every signed-in page, so the navbar is not remounted on navigation. */
function SignedIn() {
  const { pathname } = useLocation();
  // Wizards own the bottom of the screen: no tab bar or footer.
  const focused = /\/(nouvelle|nouveau|modifier)$/.test(pathname);
  return (
    <RequireAuth>
      <Shell focused={focused}>
        <Outlet />
      </Shell>
    </RequireAuth>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/connexion" element={<SignInPage />} />
        {/* Design preview of the production sign-in (e-mail, password, TOTP). Never creates a session. */}
        <Route path="/connexion-2" element={<ProductionSignInPage />} />
        <Route path="/inscription" element={<PublicRegisterPage />} />
        <Route element={<SignedIn />}>
          <Route path="/" element={<Home />} />
          <Route path="/declarations" element={<DeclarationsPage />} />
          <Route path="/declarations/nouvelle" element={<DeclarePage />} />
          <Route path="/declarations/:id" element={<DeclarationPage />} />
          <Route path="/declarations/:id/modifier" element={<DeclarePage />} />
          <Route
            path="/etablissements"
            element={
              <StaffOnly>
                <EstablishmentsPage />
              </StaffOnly>
            }
          />
          <Route path="/etablissements/nouveau" element={<StaffRegisterPage />} />
          <Route path="/etablissements/:id" element={<EstablishmentPage />} />
          <Route path="/compte" element={<AccountPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </MotionConfig>
  );
}
