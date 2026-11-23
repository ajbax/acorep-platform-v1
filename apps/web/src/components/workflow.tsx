import { useId, useState } from 'react';
import { needsComment, type StatusEvent } from '@acorep/shared';
import { Gavel, History as HistoryIcon, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { inputClass } from './form';
import { Avatar, Card, CardTitle } from './ui';

const ADVERSE = ['REJECTED', 'NON_COMPLIANT', 'REVOKED', 'SUSPENDED', 'CANCELLED'];

/**
 * Lists the moves the shared status machine allows for this user. Choosing one opens a
 * confirmation with a comment box (mandatory for adverse decisions, see needsComment()).
 * Give it `key={status}` so it resets after a decision.
 */
export function StatusActions<S extends string>({
  options,
  label,
  onMove,
  pending,
  error,
}: {
  options: S[];
  label: (to: S) => string;
  onMove: (to: S, comment: string) => void;
  pending: boolean;
  error?: string | null;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<S | null>(null);
  const [comment, setComment] = useState('');
  const id = useId();
  const required = choice ? needsComment(choice) : false;
  const missing = required && !comment.trim();

  return (
    <Card>
      <CardTitle icon={Gavel}>{t.common.actions}</CardTitle>
      <div className="space-y-2.5 px-6 pb-6 pt-2">
        {!options.length && <p className="text-sm text-ink-soft">{t.common.noActions}</p>}
        {!choice &&
          options.map((to, i) => (
            <button
              key={to}
              type="button"
              onClick={() => {
                haptic();
                setChoice(to);
              }}
              className={`flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-bold transition-colors ${
                ADVERSE.includes(to)
                  ? 'bg-white text-danger ring-1 ring-inset ring-red-200 hover:bg-danger-soft'
                  : i === 0
                    ? 'bg-ink text-white shadow-lg shadow-ink/15 hover:bg-[#13264a]'
                    : 'bg-surface text-ink hover:bg-line'
              }`}
            >
              {label(to)}
            </button>
          ))}
        {choice && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!missing) onMove(choice, comment);
            }}
            className="space-y-3"
          >
            <p className="font-display text-lg font-extrabold">{label(choice)}</p>
            <label htmlFor={id} className="block text-sm font-bold">
              {t.common.comment}
              {required && <span className="text-danger"> *</span>}
            </label>
            <textarea
              id={id}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required={required}
              aria-describedby={required ? `${id}-hint` : undefined}
              className={`${inputClass} resize-y`}
            />
            {required && (
              <p id={`${id}-hint`} className="text-xs text-ink-soft">
                {t.common.commentRequired}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm font-semibold text-danger">
                {t.apiErrors[error] ?? t.app.error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setChoice(null);
                  setComment('');
                }}
                className="min-h-12 flex-1 rounded-2xl bg-surface px-4 text-sm font-bold hover:bg-line"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={missing || pending}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-bold text-white hover:bg-[#13264a] disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {t.common.confirm}
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}

/** Append-only audit trail, newest first. */
export function History<S extends string>({ events, label }: { events: StatusEvent<S>[]; label: (s: S) => string }) {
  const { t, dateTime } = useI18n();
  const ordered = [...events].reverse();
  return (
    <Card>
      <CardTitle icon={HistoryIcon}>{t.common.history}</CardTitle>
      <ol className="px-6 pb-6 pt-2">
        {ordered.map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {i < ordered.length - 1 && (
              <span aria-hidden className="absolute left-[15px] top-9 h-[calc(100%-28px)] w-px bg-line" />
            )}
            <Avatar name={e.by.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{label(e.to)}</p>
              <p className="text-xs text-ink-soft">
                {e.by.name} · {t.roles[e.by.role]}
              </p>
              <p className="text-xs text-ink-soft">{dateTime(e.at)}</p>
              {e.comment && <p className="mt-2 rounded-2xl bg-surface p-3 text-sm text-ink">{e.comment}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
