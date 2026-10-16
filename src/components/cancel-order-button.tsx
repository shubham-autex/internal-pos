"use client";

import { useState, useTransition } from "react";
import { cancelOrder } from "@/app/actions/orders";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (result.ok) {
        setOpen(false);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Cancel"}
      </button>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      <ConfirmDialog
        open={open}
        title="Cancel order?"
        message="This marks the order as cancelled and returns its items to stock."
        confirmLabel="Cancel order"
        cancelLabel="Keep"
        danger
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
