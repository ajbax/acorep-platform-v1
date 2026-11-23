import { useId, useState } from 'react';
import { needsComment, type StatusEvent } from '@acorep/shared';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Card, CardTitle } from './ui';

const ADVERSE = ['REJECTED', 'NON_COMPLIANT', 'REVOKED', 'SUSPENDED', 'CANCELLED'];

/**
 * Lists the moves the shared status machine allows for this user. Choosing one opens a
 * confirmation with a comment box (mandatory for adverse decisions, see needsComment()).
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
      <CardTitle>{t.common.actions}</CardTitle>
      <div className="space-y-3 p-5">
        {!options.length && <p className="text-sm text-ink-soft">{t.common.noActions}</p>}
        {!choice &&
          options.map((to) => (
            <button
              key={to}
              type="button"
              onClick={() => setChoice(to)}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                ADVERSE.includes(to)
                  ? 'text-danger ring-1 ring-red-200 hover:bg-danger-soft'
                  : to === options[0]
                    ? 'bg-ink text-white hover:bg-ink/90'
                    : 'text-ink ring-1 ring-line hover:bg-surface'
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
            <p className="text-sm font-semibold">{label(choice)}</p>
            <label htmlFor={id} className="block text-xs font-medium text-ink-soft">
              {t.common.comment}
              {required && ' *'}
            </label>
            <textarea
              id={id}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required={required}
              aria-describedby={required ? `${id}-hint` : undefined}
              className="w-full rounded-lg border border-line p-3 text-sm focus-visible:border-accent"
            />
            {required && (
              <p id={`${id}-hint`} className="text-xs text-ink-soft">
                {t.common.commentRequired}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
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
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ring-line hover:bg-surface"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={missing || pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
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
  const { t } = useI18n();
  const { dateTime } = useI18n();
  return (
    <Card>
      <CardTitle>{t.common.history}</CardTitle>
      <ol className="space-y-4 p-5">
        {[...events].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative pl-5">
            <span
              aria-hidden
              className="absolute left-0 top-1.5 size-2.5 rounded-full bg-accent ring-4 ring-accent-soft"
            />
            <p className="text-sm font-semibold">{label(e.to)}</p>
            <p className="text-xs text-ink-soft">
              {dateTime(e.at)} · {e.by.name} · {t.roles[e.by.role]}
            </p>
            {e.comment && <p className="mt-1.5 rounded-lg bg-surface p-2.5 text-sm text-ink">{e.comment}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
