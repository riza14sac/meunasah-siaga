"use client";

import { useEffect, useRef } from "react";
import { BUTTON } from "./styles";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-surface p-0 shadow-card backdrop:bg-ink/50"
    >
      <div className="flex flex-col gap-2 p-6">
        <h2 id="confirm-title" className="text-base font-bold text-ink md:text-lg">
          {title}
        </h2>
        <p className="text-[13px] leading-relaxed text-ink-secondary md:text-sm">{description}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className={`${BUTTON.secondary} py-3`}>
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`${destructive ? BUTTON.danger : BUTTON.primary} py-3`}
          >
            {busy ? "Memproses…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
