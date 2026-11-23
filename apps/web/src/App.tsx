import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Shell } from '@/components/Shell';
import { RequireAuth, useSession } from '@/features/auth/AuthProvider';
import { SignInPage } from '@/features/auth/SignInPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DeclarationsPage } from '@/features/declarations/DeclarationsPage';
import { DeclarationPage } from '@/features/declarations/DeclarationPage';
import { EstablishmentsPage } from '@/features/establishments/EstablishmentsPage';
import { EstablishmentPage } from '@/features/establishments/EstablishmentPage';
import { useI18n } from '@/i18n';

/** Operators have no national view: send them to their declarations. */
function Home() {
  const s = useSession();
  return s.role === 'OPERATOR' ? <Navigate to="/declarations" replace /> : <DashboardPage />;
}

function StaffOnly({ children }: { children: JSX.Element }) {
  const s = useSession();
  return s.role === 'OPERATOR' ? <Navigate to="/declarations" replace /> : children;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-semibold">{t.app.notFound}</p>
      <Link to="/" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
        {t.app.backHome}
      </Link>
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/connexion" element={<SignInPage />} />
        <Route
          path="*"
          element={
            <RequireAuth>
              <Shell>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/declarations" element={<DeclarationsPage />} />
                  <Route path="/declarations/:id" element={<DeclarationPage />} />
                  <Route
                    path="/etablissements"
                    element={
                      <StaffOnly>
                        <EstablishmentsPage />
                      </StaffOnly>
                    }
                  />
                  <Route path="/etablissements/:id" element={<EstablishmentPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Shell>
            </RequireAuth>
          }
        />
      </Routes>
    </MotionConfig>
  );
}
