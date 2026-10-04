"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false },
);

type ZoomCaps = { min: number; max: number; step: number };

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

function getVideoTrack(region: HTMLElement | null) {
  const video = region?.querySelector("video");
  const stream = video?.srcObject as MediaStream | null | undefined;
  return stream?.getVideoTracks()?.[0] ?? null;
}

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
  const [zoomCaps, setZoomCaps] = useState<ZoomCaps | null>(null);
  const [zoom, setZoom] = useState(1);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

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

  // Read zoom / torch capabilities once the camera stream is ready.
  useEffect(() => {
    if (!open) {
      setZoomCaps(null);
      setZoom(1);
      setTorchSupported(false);
      setTorchOn(false);
      return;
    }

    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const readCaps = () => {
      if (cancelled) return;
      const track = getVideoTrack(regionRef.current);
      if (!track) {
        if (tries++ < 24) timer = setTimeout(readCaps, 250);
        return;
      }

      const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
        zoom?: { min: number; max: number; step?: number };
        torch?: boolean;
      };
      const settings = track.getSettings?.() as MediaTrackSettings & {
        zoom?: number;
        torch?: boolean;
      };

      if (caps?.zoom && caps.zoom.max > caps.zoom.min) {
        setZoomCaps({
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step && caps.zoom.step > 0 ? caps.zoom.step : 0.1,
        });
        setZoom(settings?.zoom ?? caps.zoom.min);
      } else {
        setZoomCaps(null);
      }

      setTorchSupported(Boolean(caps?.torch));
      setTorchOn(Boolean(settings?.torch));
    };

    timer = setTimeout(readCaps, 500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [open]);

  const applyZoom = useCallback(async (next: number) => {
    const track = getVideoTrack(regionRef.current);
    if (!track || !zoomCaps) return;
    const value = Math.min(zoomCaps.max, Math.max(zoomCaps.min, next));
    try {
      await track.applyConstraints({
        advanced: [{ zoom: value } as MediaTrackConstraintSet],
      });
      setZoom(value);
      // Torch often turns off when zoom changes on mobile.
      setTorchOn(false);
    } catch {
      // Ignore unsupported zoom apply.
    }
  }, [zoomCaps]);

  const toggleTorch = useCallback(async () => {
    const track = getVideoTrack(regionRef.current);
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // Ignore unsupported torch apply.
    }
  }, [torchOn, torchSupported]);

  if (!open) return null;

  const showControls = Boolean(zoomCaps) || torchSupported;

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
          components={{ finder: false, torch: false, zoom: false }}
          styles={{
            container: { width: "100%", height: "100%" },
            video: { objectFit: "cover" },
          }}
        />
      </div>

      {showControls ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          {zoomCaps ? (
            <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom <= zoomCaps.min || paused}
                onClick={() => applyZoom(zoom - zoomCaps.step)}
                className="h-9 w-9 rounded-lg text-lg font-semibold text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-12 text-center text-xs font-medium text-[var(--ink-muted)]">
                {zoom.toFixed(1)}×
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom >= zoomCaps.max || paused}
                onClick={() => applyZoom(zoom + zoomCaps.step)}
                className="h-9 w-9 rounded-lg text-lg font-semibold text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-40"
              >
                +
              </button>
            </div>
          ) : (
            <span />
          )}

          {torchSupported ? (
            <button
              type="button"
              aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
              aria-pressed={torchOn}
              disabled={paused}
              onClick={toggleTorch}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${
                torchOn
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--surface)]"
              }`}
            >
              {torchOn ? "Flash on" : "Flash"}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--ink-muted)] sm:text-sm">
          {paused
            ? "Scanner paused — finish quantity first."
            : "Hold a QR / barcode in front of the camera."}
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
