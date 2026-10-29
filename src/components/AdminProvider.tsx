"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { BUTTON, INPUT } from "@/components/ui/styles";

interface AdminContextValue {
  isAdmin: boolean | null;
  /** fetch() that asks for the admin PIN once when the server says it is needed, then retries. */
  adminFetch: (input: string, init?: RequestInit) => Promise<Response>;
  /** Opens the PIN dialog; resolves true once the PIN was accepted. */
  requestPin: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const waiting = useRef<((ok: boolean) => void)[]>([]);

  useEffect(() => {
    fetch("/api/auth/pin", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { admin: boolean }) => setIsAdmin(json.admin))
      .catch(() => setIsAdmin(false));
  }, []);

  const askPin = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        waiting.current.push(resolve);
        setAsking(true);
      }),
    []
  );

  const finish = useCallback((ok: boolean) => {
    setAsking(false);
    if (ok) setIsAdmin(true);
    for (const resolve of waiting.current.splice(0)) resolve(ok);
  }, []);

  const adminFetch = useCallback(
    async (input: string, init?: RequestInit) => {
      const res = await fetch(input, init);
      if (res.status !== 401) return res;
      const body = (await res.clone().json().catch(() => null)) as { code?: string } | null;
      if (body?.code !== "PIN_REQUIRED") return res;
      setIsAdmin(false);
      return (await askPin()) ? fetch(input, init) : res;
    },
    [askPin]
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/pin", { method: "DELETE" });
    setIsAdmin(false);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, adminFetch, requestPin: askPin, signOut }}>
      {children}
      <PinDialog open={asking} onDone={finish} />
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin harus dipakai di dalam AdminProvider");
  return ctx;
}

function PinDialog({ open, onDone }: { open: boolean; onDone: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setPin("");
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        onDone(true);
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "PIN tidak bisa diperiksa");
    } catch {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onDone(false);
      }}
      aria-labelledby="pin-title"
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-surface p-0 shadow-card backdrop:bg-ink/50"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <KeyRound size={20} strokeWidth={1.5} />
          </span>
          <div>
            <h2 id="pin-title" className="text-base font-bold text-ink">
              Masukkan PIN admin
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
              Cukup sekali di perangkat ini untuk mengubah atau menghapus data.
            </p>
          </div>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          aria-label="PIN admin"
          aria-invalid={error !== null}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={`${INPUT} text-center text-lg tracking-[0.4em]`}
        />
        {error && (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onDone(false)} className={BUTTON.secondary}>
            Batal
          </button>
          <button type="submit" disabled={busy || !pin.trim()} className={BUTTON.primary}>
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
