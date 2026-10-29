/**
 * Parses a number typed with either a decimal comma ("11,8") or point.
 * Returns null for an empty field and NaN for anything that is not a number.
 */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : NaN;
}
