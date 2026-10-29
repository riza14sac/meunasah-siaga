// Deterministic per-key randomness so a given simulated day's event plan
// (wudhu jitter, forced blackout choice) stays stable across ticks without
// needing to persist it — re-derived from the same seed every time.

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic pseudo-random number in [0, 1) derived from `key`. */
export function seededRandom(key: string): number {
  return mulberry32(hashString(key))();
}

/** Deterministic pseudo-random number in [min, max) derived from `key`. */
export function seededRange(key: string, min: number, max: number): number {
  return min + seededRandom(key) * (max - min);
}
