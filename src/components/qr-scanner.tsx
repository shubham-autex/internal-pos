"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { getCameraConstraints, saveCameraDeviceId } from "@/lib/camera";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false },
);

const SCAN_FORMATS = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
];

const SCANNER_COMPONENTS = { finder: false, torch: false, zoom: false };

const SCANNER_STYLES = {
  container: { width: "100%", height: "100%" },
  video: { objectFit: "cover" as const },
};

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
  const [activated, setActivated] = useState(variant === "inline" || open);
  const [error, setError] = useState<string | null>(null);
  const [zoomCaps, setZoomCaps] = useState<ZoomCaps | null>(null);
  const [zoom, setZoom] = useState(1);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [constraints, setConstraints] = useState<MediaTrackConstraints>(() =>
    getCameraConstraints(),
  );

  useEffect(() => {
    if (open) setActivated(true);
  }, [open]);

  const streaming = open && !paused;

  const handleScan = useCallback(
    (codes: IDetectedBarcode[]) => {
      if (!streaming) return;
      const value = codes[0]?.rawValue?.trim();
      if (!value) return;

      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.value === value && now - last.at < 2000) return;
      lastScanRef.current = { value, at: now };

      onScan(value);
      if (variant === "modal") onClose?.();
    },
    [onClose, onScan, streaming, variant],
  );

  // Read zoom / torch capabilities once the camera stream is ready.
  useEffect(() => {
    if (!streaming) {
      setZoomCaps(null);
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

      const deviceId = track.getSettings?.()?.deviceId;
      if (deviceId) {
        saveCameraDeviceId(deviceId);
        setConstraints((prev) => {
          const next = getCameraConstraints();
          // Keep referential stability unless device targeting actually changed.
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
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
  }, [streaming]);

  const applyZoom = useCallback(
    async (next: number) => {
      const track = getVideoTrack(regionRef.current);
      if (!track || !zoomCaps) return;
      const value = Math.min(zoomCaps.max, Math.max(zoomCaps.min, next));
      try {
        await track.applyConstraints({
          advanced: [{ zoom: value } as MediaTrackConstraintSet],
        });
        setZoom(value);
        setTorchOn(false);
      } catch {
        // Ignore unsupported zoom apply.
      }
    },
    [zoomCaps],
  );

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

  const showControls = useMemo(
    () => streaming && (Boolean(zoomCaps) || torchSupported),
    [streaming, torchSupported, zoomCaps],
  );

  // Wait until first open so we only request camera after a user gesture.
  if (!activated) return null;

  const camera = (
    <>
      <div
        ref={regionRef}
        className="qr-inline-region overflow-hidden rounded-xl bg-black"
      >
        <Scanner
          onScan={handleScan}
          onError={(err) => {
            setError(
              err?.message || "Camera access failed. Allow permission and try again.",
            );
          }}
          constraints={constraints}
          formats={SCAN_FORMATS}
          paused={!streaming}
          allowMultiple
          scanDelay={1500}
          sound={false}
          components={SCANNER_COMPONENTS}
          styles={SCANNER_STYLES}
        />
      </div>

      {showControls ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          {zoomCaps ? (
            <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom <= zoomCaps.min}
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
                disabled={zoom >= zoomCaps.max}
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
              onClick={toggleTorch}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
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
      ) : open ? (
        <p className="mt-2 text-xs text-[var(--ink-muted)] sm:text-sm">
          {paused
            ? "Scanner paused — finish quantity first."
            : "Hold a QR / barcode in front of the camera."}
        </p>
      ) : null}
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

  // Keep scanner mounted after first open so the browser only prompts once.
  return (
    <div
      className={
        open
          ? "fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          : "hidden"
      }
      aria-hidden={!open}
    >
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
