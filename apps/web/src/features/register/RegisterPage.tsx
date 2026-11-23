import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { canRegisterAny } from '@acorep/shared';
import { useI18n } from '@/i18n';
import { useAuth } from '@/features/auth/AuthProvider';
import { Mark } from '@/components/ui';
import { RegisterWizard } from './RegisterWizard';

/**
 * Public self-registration (/inscription): a new establishment creates its account with its file.
 * Signed-in staff use /etablissements/nouveau inside the app instead.
 */
export function PublicRegisterPage() {
  const { t } = useI18n();
  const { session } = useAuth();
  // Checked once: the wizard signs the new operator in at the end and must keep its success screen.
  const [signedInAtStart] = useState(() => !!session);
  if (signedInAtStart && session) {
    return (
      <Navigate
        to={session.role === 'OPERATOR' ? `/etablissements/${session.establishmentId}` : '/etablissements/nouveau'}
        replace
      />
    );
  }
  return (
    <div className="min-h-screen px-4 pb-40 sm:px-6">
      <header className="mx-auto flex max-w-2xl items-center justify-between py-5">
        <Link to="/connexion" className="flex items-center gap-2.5" aria-label={t.nav.home}>
          <Mark className="h-9 w-9" />
          <span className="font-display text-xl font-extrabold tracking-wide">{t.app.name}</span>
        </Link>
        {!session && (
          <Link to="/connexion" className="rounded-full bg-surface px-4 py-2 text-sm font-bold hover:bg-line">
            {t.signIn.as}
          </Link>
        )}
      </header>
      <RegisterWizard exitTo="/connexion" />
    </div>
  );
}

/** Staff registering on an establishment's behalf (admins, provincial officers). */
export function StaffRegisterPage() {
  const { session } = useAuth();
  if (!canRegisterAny(session)) return <Navigate to="/" replace />;
  return <RegisterWizard exitTo="/etablissements" />;
}
