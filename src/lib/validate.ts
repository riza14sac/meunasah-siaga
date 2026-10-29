import { ValidationError } from "./http";

export type Body = Record<string, unknown>;

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

interface NumberRule {
  min: number;
  max: number;
  integer?: boolean;
  label?: string;
  unit?: string;
}

function rangeMessage(key: string, rule: NumberRule): string {
  return `${rule.label ?? key} harus angka antara ${rule.min} dan ${rule.max}${rule.unit ? ` ${rule.unit}` : ""}`;
}

export function numberField(body: Body, key: string, rule: NumberRule): number {
  const v = body[key];
  if (typeof v !== "number" || !Number.isFinite(v) || v < rule.min || v > rule.max) {
    throw new ValidationError(rangeMessage(key, rule));
  }
  return rule.integer ? Math.round(v) : v;
}

/** `undefined` when absent; `null` is rejected. */
export function optionalNumberField(body: Body, key: string, rule: NumberRule): number | undefined {
  return body[key] === undefined ? undefined : numberField(body, key, rule);
}

/** `undefined` when absent, `null` when sent as null or an empty string. */
export function nullableNumberField(body: Body, key: string, rule: NumberRule): number | null | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  return numberField(body, key, rule);
}

export function textField(body: Body, key: string, opts: { label: string; max: number }): string {
  const v = body[key];
  if (typeof v !== "string" || v.trim().length === 0) throw new ValidationError(`${opts.label} wajib diisi`);
  if (v.trim().length > opts.max) throw new ValidationError(`${opts.label} maksimal ${opts.max} karakter`);
  return v.trim();
}

/** `undefined` when absent, `null` when sent empty. */
export function optionalTextField(body: Body, key: string, opts: { label: string; max: number }): string | null | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") throw new ValidationError(`${opts.label} harus berupa teks`);
  const trimmed = v.trim();
  if (trimmed.length > opts.max) throw new ValidationError(`${opts.label} maksimal ${opts.max} karakter`);
  return trimmed.length === 0 ? null : trimmed;
}

export function optionalBooleanField(body: Body, key: string, label = key): boolean | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  if (v === 0 || v === 1) return v === 1;
  throw new ValidationError(`${label} harus true atau false`);
}
