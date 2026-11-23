import { useQuery } from '@tanstack/react-query';
import { canRegisterAny, IMPORTING_KINDS, type Session } from '@acorep/shared';
import { data } from '@/services';
import { useSession } from '@/features/auth/AuthProvider';
import { useI18n } from '@/i18n';

/** Sections of the navigation. Which ones a user gets depends on their role. */
export type GroupKey = 'dashboard' | 'declarations' | 'establishments' | 'register' | 'mine' | 'declare' | 'account';

export interface NavGroup {
  key: GroupKey;
  label: string;
  /** Shorter label for the phone tab bar. */
  short?: string;
  to: string;
}

/** The operator's own establishment (cached; shared with the detail page). */
export function useMyEstablishment(s: Session) {
  return useQuery({
    queryKey: ['establishment', s.establishmentId],
    queryFn: () => data.getEstablishment(s.establishmentId!),
    enabled: s.role === 'OPERATOR' && !!s.establishmentId,
  });
}

export function useNavGroups(): { groups: NavGroup[]; cta: NavGroup | null } {
  const s = useSession();
  const { t } = useI18n();
  const mine = useMyEstablishment(s);
  if (s.role === 'OPERATOR') {
    const importer = !!mine.data && IMPORTING_KINDS.includes(mine.data.kind);
    const groups: NavGroup[] = [
      {
        key: 'mine',
        label: t.nav.myEstablishment,
        short: t.nav.short.mine,
        to: `/etablissements/${s.establishmentId}`,
      },
      ...(importer ? [{ key: 'declarations' as const, label: t.nav.declarations, to: '/declarations' }] : []),
      ...(importer
        ? [{ key: 'declare' as const, label: t.nav.declare, short: t.nav.short.declare, to: '/declarations/nouvelle' }]
        : []),
      { key: 'account', label: t.nav.account, short: t.nav.short.account, to: '/compte' },
    ];
    return { groups, cta: groups.find((g) => g.key === 'declare') ?? null };
  }
  const groups: NavGroup[] = [
    { key: 'dashboard', label: t.nav.dashboard, short: t.nav.short.dashboard, to: '/' },
    { key: 'declarations', label: t.nav.declarations, to: '/declarations' },
    { key: 'establishments', label: t.nav.establishments, short: t.nav.short.establishments, to: '/etablissements' },
    ...(canRegisterAny(s)
      ? [
          {
            key: 'register' as const,
            label: t.nav.register,
            short: t.nav.short.register,
            to: '/etablissements/nouveau',
          },
        ]
      : []),
    { key: 'account', label: t.nav.account, short: t.nav.short.account, to: '/compte' },
  ];
  return { groups, cta: groups.find((g) => g.key === 'register') ?? null };
}

/**
 * Items waiting on this user, shown as a badge: new submissions for reviewers, requests for
 * information for importers.
 */
export function useAttention(): Partial<Record<GroupKey, number>> {
  const s = useSession();
  const declarations = useQuery({
    queryKey: ['declarations'],
    queryFn: () => data.listDeclarations(),
    enabled: s.role !== 'PROVINCIAL_OFFICER' && s.role !== 'LEADERSHIP',
  });
  const establishments = useQuery({
    queryKey: ['establishments'],
    queryFn: () => data.listEstablishments(),
    enabled: s.role === 'PROVINCIAL_OFFICER' || s.role === 'ADMIN',
  });
  const d = declarations.data ?? [];
  if (s.role === 'OPERATOR') return { declarations: d.filter((x) => x.status === 'INFO_REQUESTED').length };
  if (s.role === 'INSPECTOR') return { declarations: d.filter((x) => x.status === 'APPROVED').length };
  const est = (establishments.data ?? []).filter((e) => e.status === 'SUBMITTED').length;
  if (s.role === 'PROVINCIAL_OFFICER') return { establishments: est };
  return { declarations: d.filter((x) => x.status === 'SUBMITTED').length, establishments: est };
}

export const isActivePath = (pathname: string, to: string) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

/** The group a path belongs to: the most specific match wins (/declarations/nouvelle → declare). */
export function groupForPath(groups: NavGroup[], pathname: string): GroupKey {
  const matches = groups.filter((g) => isActivePath(pathname, g.to)).sort((a, b) => b.to.length - a.to.length);
  return matches[0]?.key ?? groups[0]!.key;
}
