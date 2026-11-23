import { useQueryClient } from '@tanstack/react-query';
import { Building2, KeyRound, LogOut, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';
import { provinceName } from '@acorep/shared';
import { useI18n } from '@/i18n';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { useMyEstablishment } from '@/components/nav/groups';
import { Avatar, ButtonLink, Card, CardTitle, Field, PageHeader, buttonClass } from '@/components/ui';

export function AccountPage() {
  const { t } = useI18n();
  const session = useSession();
  const { signOut } = useAuth();
  const qc = useQueryClient();
  const mine = useMyEstablishment(session);
  const scope = session.province
    ? provinceName(session.province)
    : session.role === 'OPERATOR'
      ? null
      : t.account.national;

  return (
    <>
      <PageHeader eyebrow={t.account.eyebrow} title={t.account.lead} accent={t.account.accent} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center gap-4 px-6 pt-6">
            <Avatar name={session.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-extrabold">{session.name}</p>
              <p className="text-sm text-ink-soft">{t.roles[session.role]}</p>
            </div>
          </div>
          <CardTitle icon={UserRound}>{t.account.identity}</CardTitle>
          <dl className="divide-y divide-line px-6 pb-4">
            <Field label={t.account.role}>{t.roles[session.role]}</Field>
            {scope && <Field label={t.account.scope}>{scope}</Field>}
            {mine.data && <Field label={t.account.establishment}>{mine.data.legalName}</Field>}
          </dl>
          {mine.data && (
            <div className="px-6 pb-6">
              <ButtonLink to={`/etablissements/${mine.data.id}`} variant="ghost">
                <Building2 className="h-4 w-4" aria-hidden />
                {t.nav.myEstablishment}
              </ButtonLink>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle icon={KeyRound}>{t.account.security}</CardTitle>
            <div className="space-y-4 px-6 pb-6">
              <p className="flex items-start gap-3 rounded-2xl bg-ok-soft p-4 text-sm font-semibold text-ok">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                {t.account.mfa}
              </p>
              <p className="text-sm text-ink-soft">{t.account.securityBody}</p>
              <button type="button" onClick={signOut} className={`${buttonClass('primary')} w-full`}>
                <LogOut className="h-4 w-4" aria-hidden />
                {t.nav.signOut}
              </button>
            </div>
          </Card>
          <Card>
            <CardTitle icon={RotateCcw}>{t.account.demo}</CardTitle>
            <div className="space-y-4 px-6 pb-6">
              <p className="text-sm text-ink-soft">{t.account.demoBody}</p>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('acorep.mock.v1');
                  } catch {
                    /* nothing stored */
                  }
                  qc.clear();
                  window.location.reload();
                }}
                className={`${buttonClass('ghost')} w-full`}
              >
                {t.account.reset}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
