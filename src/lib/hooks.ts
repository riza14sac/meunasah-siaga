"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Fetches `url` now and again every `intervalMs` while the tab is visible, so
 * a phone left open in a pocket does not keep hitting the server.
 * `intervalMs = 0` fetches once; `url = null` pauses.
 */
export function usePolling<T>(url: string | null, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let inFlight = false;
    let timer: number | undefined;

    const run = async () => {
      if (inFlight) return;
      inFlight = true;
      window.clearTimeout(timer);
      try {
        const res = await fetch(url, { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok) {
          setData(body as T);
          setError(null);
          setUpdatedAt(Date.now());
        } else {
          setError((body as { error?: string } | null)?.error ?? "Gagal memuat data");
        }
      } catch {
        if (!cancelled) setError("Tidak bisa terhubung ke server");
      } finally {
        inFlight = false;
        if (!cancelled && intervalMs > 0) timer = window.setTimeout(tick, intervalMs);
      }
    };
    const tick = () => {
      if (document.visibilityState === "visible") void run();
      else timer = window.setTimeout(tick, intervalMs);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void run();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void run();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [url, intervalMs, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, updatedAt, refresh };
}

/** Reads `{ error }` from a failed response, with a fallback message. */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}
