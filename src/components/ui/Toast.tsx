"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";

type ToastTone = "good" | "critical";

export function Toast({ message, tone }: { message: string; tone: ToastTone }) {
  const Icon = tone === "good" ? CircleCheck : CircleX;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-card md:bottom-8"
    >
      <Icon size={18} strokeWidth={1.5} className={`shrink-0 ${tone === "good" ? "text-success-bright" : "text-danger"}`} />
      {message}
    </div>
  );
}

/** Toast state that clears itself after three seconds. */
export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((message: string, tone: ToastTone = "good") => setToast({ message, tone }), []);
  return { toast, showToast };
}
