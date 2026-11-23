import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { declareError, EDITABLE_STATUSES } from '@acorep/shared';
import { data } from '@/services';
import { useI18n } from '@/i18n';
import { useSession } from '@/features/auth/AuthProvider';
import { useMyEstablishment } from '@/components/nav/groups';
import { ButtonLink, ErrorState, IconTile, Loading } from '@/components/ui';
import { DeclareWizard } from './DeclareWizard';

/** /declarations/nouvelle and /declarations/:id/modifier. */
export function DeclarePage() {
  const { id } = useParams();
  const { t } = useI18n();
  const session = useSession();
  const mine = useMyEstablishment(session);
  const existing = useQuery({
    queryKey: ['declaration', id],
    queryFn: () => data.getDeclaration(id!),
    enabled: !!id,
  });

  if (session.role !== 'OPERATOR') return <Blocked message={t.declare.notAllowed.not_importer} />;
  if (mine.isPending || (id && existing.isPending)) return <Loading />;
  if (mine.isError) return <ErrorState error={mine.error} />;
  if (existing.isError) return <ErrorState error={existing.error} />;

  const code = declareError(session, mine.data);
  if (code) return <Blocked message={t.declare.notAllowed[code]} to={`/etablissements/${mine.data.id}`} />;
  if (existing.data && !EDITABLE_STATUSES.includes(existing.data.status)) {
    return <Blocked message={t.apiErrors.forbidden!} to={`/declarations/${existing.data.id}`} />;
  }
  return <DeclareWizard key={id ?? 'new'} existing={existing.data} />;
}

function Blocked({ message, to = '/declarations' }: { message: string; to?: string }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="flex justify-center">
        <IconTile icon={ShieldAlert} size="lg" tone="bg-warn-soft text-warn" />
      </div>
      <p className="mt-5 font-display text-xl font-extrabold">{message}</p>
      <ButtonLink to={to} variant="ghost" className="mt-6">
        {t.common.back}
      </ButtonLink>
    </div>
  );
}
