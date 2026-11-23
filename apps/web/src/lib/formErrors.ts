/** The part of a schema issue we use (structural, so the web app needs no direct Zod dependency). */
interface Issue {
  path: (string | number)[];
  message: string;
}

const valueAt = (obj: unknown, path: (string | number)[]) =>
  path.reduce<unknown>(
    (o, k) => (o !== null && typeof o === 'object' ? (o as Record<string | number, unknown>)[k] : undefined),
    obj,
  );

const isEmpty = (v: unknown) => v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));

/**
 * Turns schema issues into { "dot.path": errorCode }. An empty field always reads "required"
 * (not "wrong format"), and Zod's own messages (enum or type errors) also become "required".
 */
export function issuesToErrors(issues: Issue[], input: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    const code = isEmpty(valueAt(input, issue.path)) || !/^[a-z_]+$/.test(issue.message) ? 'required' : issue.message;
    errors[key] ??= code;
  }
  return errors;
}
