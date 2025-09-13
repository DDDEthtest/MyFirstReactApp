// Lightweight placeholder for validation helpers. Replace with zod/yup if desired.

export type Validator<T> = (input: unknown) => input is T;

export function isString(v: unknown): v is string {
  return typeof v === 'string';
}

export function isNonEmptyString(v: unknown): v is string {
  return isString(v) && v.trim().length > 0;
}

export function requireFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]) {
  for (const f of fields) {
    if (obj[f] == null || obj[f] === '') throw new Error(`Missing required field: ${String(f)}`);
  }
  return obj;
}

