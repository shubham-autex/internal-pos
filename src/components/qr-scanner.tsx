"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false },
);

/** Mild default zoom into available camera range for small QR codes. */
const DEFAULT_ZOOM_RATIO = 0.4;

type QrScannerProps = {
  open: boolean;
  onClose?: () => void;
  onScan: (value: string) => void;
  title?: string;
  /** modal: overlay (default). inline: always-visible camera panel. */
  variant?: "modal" | "inline";
  /** Pause detection while true (e.g. qty dialog open). */
  paused?: boolean;
};

export function QrScanner({
  open,
  onClose,
  onScan,
  title = "Scan product QR",
  variant = "inline",
  paused = false,
}: QrScannerProps) {
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(
    (codes: IDetectedBarcode[]) => {
      if (paused) return;
      const value = codes[0]?.rawValue?.trim();
      if (!value) return;

      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.value === value && now - last.at < 2000) return;
      lastScanRef.current = { value, at: now };

      onScan(value);
      if (variant === "modal") onClose?.();
    },
    [onClose, onScan, paused, variant],
  );

  // Apply a bit of optical zoom once the camera stream is ready (when supported).
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const applyDefaultZoom = async () => {
      if (cancelled) return;

      const video = regionRef.current?.querySelector("video");
      const stream = video?.srcObject as MediaStream | null | undefined;
      const track = stream?.getVideoTracks()?.[0];

      if (!track) {
        if (tries++ < 24) {
          timer = setTimeout(applyDefaultZoom, 250);
        }
        return;
      }

      const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
        zoom?: { min: number; max: number; step?: number };
      };
      if (!caps?.zoom || caps.zoom.max <= caps.zoom.min) return;

      const { min, max } = caps.zoom;
      const target = Math.min(max, min + (max - min) * DEFAULT_ZOOM_RATIO);

      try {
        await track.applyConstraints({
          advanced: [{ zoom: target } as MediaTrackConstraintSet],
        });
      } catch {
        // Some browsers expose zoom in capabilities but reject applyConstraints.
      }
    };

    timer = setTimeout(applyDefaultZoom, 600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [open]);

  if (!open) return null;

  const camera = (
    <>
      <div
        ref={regionRef}
        className="qr-inline-region overflow-hidden rounded-xl bg-black"
      >
        <Scanner
          onScan={handleScan}
          onError={(err) => {
            setError(err?.message || "Camera access failed. Allow permission and try again.");
          }}
          constraints={{
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }}
          formats={[
            "qr_code",
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
          ]}
          paused={paused}
          allowMultiple
          scanDelay={1500}
          sound={false}
          components={{ finder: true, zoom: true }}
          styles={{
            container: { width: "100%", height: "100%" },
            video: { objectFit: "cover" },
          }}
        />
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--ink-muted)] sm:text-sm">
          {paused
            ? "Scanner paused — finish quantity first."
            : "Hold a QR / barcode in front of the camera. Use + / − to zoom for small codes."}
        </p>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold sm:font-[family-name:var(--font-display)] sm:text-lg">
            {title}
          </h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              paused
                ? "bg-[var(--surface-muted)] text-[var(--ink-muted)]"
                : error
                  ? "bg-red-100 text-red-800"
                  : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {paused ? "Paused" : error ? "Error" : "Live"}
          </span>
        </div>
        {camera}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]"
          >
            Close
          </button>
        </div>
        {camera}
      </div>
    </div>
  );
}
