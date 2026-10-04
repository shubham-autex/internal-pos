"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type SheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Sticky actions below the scrollable body */
  footer?: ReactNode;
  /** Wider sheet for forms with more content */
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

function blurActiveField() {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    (active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.tagName === "SELECT")
  ) {
    active.blur();
  }
}

function isEditableField(el: Element | null): el is HTMLElement {
  return (
    el instanceof HTMLElement &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT")
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback(() => {
    blurActiveField();
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  /**
   * After an input is focused, the first tap on Close/Cancel often only
   * dismisses the soft keyboard — the click is lost when the viewport jumps.
   * Activate the control immediately on pointerdown instead.
   */
  function onPanelPointerDownCapture(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;

    const target = e.target;
    if (!(target instanceof Element)) return;

    const action = target.closest("button, a[href], [role='button']");
    if (!(action instanceof HTMLElement) || !panelRef.current?.contains(action)) {
      return;
    }

    if (action instanceof HTMLButtonElement && action.disabled) return;

    const active = document.activeElement;
    if (!isEditableField(active) || !panelRef.current.contains(active)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    blurActiveField();
    action.click();
  }

  function onBackdropPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    e.preventDefault();
    close();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
      role="presentation"
      onPointerDown={onBackdropPointerDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-[var(--surface)] shadow-xl sm:max-h-[85dvh] sm:rounded-2xl ${sizeClass[size]}`}
        onPointerDownCapture={onPanelPointerDownCapture}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-center pt-2 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[var(--line)]" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-4 pb-3 pt-2 sm:px-5 sm:pt-4">
          <h2 id={titleId} className="text-lg font-semibold leading-snug sm:text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]"
          >
            Close
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 ${
            footer ? "" : "pb-[max(1rem,env(safe-area-inset-bottom))]"
          }`}
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
