"use client";

import { Sheet } from "@/components/sheet";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-[var(--ink-muted)]">{message}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-3.5 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-xl px-3 py-3.5 text-sm font-semibold ${
            danger
              ? "bg-red-700 text-white"
              : "bg-[var(--accent)] text-[var(--accent-ink)]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
