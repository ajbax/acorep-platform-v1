import type { DeclarationStatus, EffectiveEstablishmentStatus } from '@acorep/shared';

export type Tone = 'neutral' | 'info' | 'warn' | 'ok' | 'danger';

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-info-soft text-info ring-blue-200',
  warn: 'bg-warn-soft text-warn ring-amber-200',
  ok: 'bg-ok-soft text-ok ring-green-200',
  danger: 'bg-danger-soft text-danger ring-red-200',
};

export const DECLARATION_TONE: Record<DeclarationStatus, Tone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  INFO_REQUESTED: 'warn',
  APPROVED: 'ok',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  CLEARED: 'ok',
  NON_COMPLIANT: 'danger',
};

export const ESTABLISHMENT_TONE: Record<EffectiveEstablishmentStatus, Tone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  INFO_REQUESTED: 'warn',
  ACTIVE: 'ok',
  REJECTED: 'danger',
  SUSPENDED: 'warn',
  REVOKED: 'danger',
  CLOSED: 'neutral',
  EXPIRED: 'danger',
};
