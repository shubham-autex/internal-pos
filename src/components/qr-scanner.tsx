"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyPreferredFocus,
  getCameraConstraints,
  pickDefaultOpticalZoom,
  saveCameraDeviceId,
} from "@/lib/camera";
import { createBarcodeDetector, drawZoomedFrame } from "@/lib/barcode-scan";

const MIN_DIGITAL_ZOOM = 1.2;
const MAX_DIGITAL_ZOOM = 4;
const DEFAULT_DIGITAL_ZOOM = 2.2;
const DETECT_INTERVAL_MS = 90;
const WIDE_FRAME_EVERY = 5;
const DUP_WINDOW_MS = 700;

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

function getVideoTrack(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null | undefined;
  return stream?.getVideoTracks()?.[0] ?? null;
}

function stopStream(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null | undefined;
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const digitalZoomRef = useRef(DEFAULT_DIGITAL_ZOOM);
  const onScanRef = useRef(onScan);
  const [activated, setActivated] = useState(variant === "inline" || open);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [zoomCaps, setZoomCaps] = useState<ZoomCaps | null>(null);
  const [opticalZoom, setOpticalZoom] = useState(1);
  const [digitalZoom, setDigitalZoom] = useState(DEFAULT_DIGITAL_ZOOM);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  if (open && !activated) {
    setActivated(true);
  }

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    digitalZoomRef.current = digitalZoom;
  }, [digitalZoom]);

  const streaming = activated && open && !paused;

  const emitScan = useCallback((value: string) => {
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.value === value && now - last.at < DUP_WINDOW_MS) return;
    lastScanRef.current = { value, at: now };
    onScanRef.current(value);
    if (variant === "modal") onClose?.();
  }, [onClose, variant]);

  useEffect(() => {
    if (!activated || !open) return;

    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: getCameraConstraints(),
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        if (cancelled) {
          stopStream(video);
          return;
        }

        const track = stream.getVideoTracks()[0];
        const deviceId = track?.getSettings?.()?.deviceId;
        if (deviceId) saveCameraDeviceId(deviceId);
        if (track) await applyPreferredFocus(track);

        const caps = track?.getCapabilities?.() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number; step?: number };
          torch?: boolean;
        };
        if (caps?.zoom && caps.zoom.max > caps.zoom.min) {
          const next = pickDefaultOpticalZoom(caps.zoom.min, caps.zoom.max);
          try {
            await track.applyConstraints({
              advanced: [{ zoom: next } as MediaTrackConstraintSet],
            });
          } catch {
            // Keep stream even if optical zoom is rejected.
          }
          setZoomCaps({
            min: caps.zoom.min,
            max: caps.zoom.max,
            step: caps.zoom.step && caps.zoom.step > 0 ? caps.zoom.step : 0.1,
          });
          setOpticalZoom(next);
        } else {
          setZoomCaps(null);
        }
        setTorchSupported(Boolean(caps?.torch));
        setTorchOn(false);
        setLive(true);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Camera access failed. Allow permission and try again.";
        setError(message);
        setLive(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      setLive(false);
      stopStream(video);
    };
  }, [activated, open]);

  useEffect(() => {
    if (!streaming || !live) return;

    let cancelled = false;
    let frame = 0;
    const detector = createBarcodeDetector();
    const canvas = canvasRef.current ?? document.createElement("canvas");

    const tick = async () => {
      const video = videoRef.current;
      if (cancelled || !video || video.readyState < 2) return;

      const zoom =
        frame++ % WIDE_FRAME_EVERY === 0
          ? Math.max(1.15, digitalZoomRef.current * 0.7)
          : digitalZoomRef.current;
      const source = drawZoomedFrame(video, canvas, zoom);
      if (!source) return;

      try {
        const codes = await detector.detect(source);
        const value = codes[0]?.rawValue?.trim();
        if (value) emitScan(value);
      } catch {
        // Skip a bad frame; keep the loop alive.
      }
    };

    let busy = false;
    const id = window.setInterval(() => {
      if (busy) return;
      busy = true;
      void tick().finally(() => {
        busy = false;
      });
    }, DETECT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [emitScan, live, streaming]);

  const applyOpticalZoom = useCallback(
    async (next: number) => {
      const track = getVideoTrack(videoRef.current);
      if (!track || !zoomCaps) return;
      const value = Math.min(zoomCaps.max, Math.max(zoomCaps.min, next));
      try {
        await track.applyConstraints({
          advanced: [{ zoom: value } as MediaTrackConstraintSet],
        });
        setOpticalZoom(value);
        if (torchOn) {
          try {
            await track.applyConstraints({
              advanced: [{ torch: true } as MediaTrackConstraintSet],
            });
          } catch {
            setTorchOn(false);
          }
        }
      } catch {
        // Ignore unsupported zoom apply.
      }
    },
    [torchOn, zoomCaps],
  );

  const setDigital = useCallback((next: number) => {
    setDigitalZoom(Math.min(MAX_DIGITAL_ZOOM, Math.max(MIN_DIGITAL_ZOOM, next)));
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = getVideoTrack(videoRef.current);
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

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;

    let startDist = 0;
    let startZoom = digitalZoomRef.current;

    function distance(a: Touch, b: Touch) {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      startDist = distance(e.touches[0], e.touches[1]);
      startZoom = digitalZoomRef.current;
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || startDist <= 0) return;
      e.preventDefault();
      const ratio = distance(e.touches[0], e.touches[1]) / startDist;
      setDigital(startZoom * ratio);
    }

    region.addEventListener("touchstart", onTouchStart, { passive: true });
    region.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      region.removeEventListener("touchstart", onTouchStart);
      region.removeEventListener("touchmove", onTouchMove);
    };
  }, [activated, setDigital]);

  if (!activated) return null;

  const camera = (
    <>
      <div
        ref={regionRef}
        className="qr-inline-region overflow-hidden rounded-xl bg-black"
      >
        <video
          ref={videoRef}
          className="qr-video"
          muted
          playsInline
          autoPlay
          style={{ transform: `scale(${digitalZoom})` }}
        />
        <div className="qr-finder" aria-hidden />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-1">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={paused || digitalZoom <= MIN_DIGITAL_ZOOM}
            onClick={() => setDigital(digitalZoom - 0.3)}
            className="h-10 w-10 rounded-lg text-lg font-semibold text-[var(--ink)] active:bg-[var(--surface)] disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-12 text-center text-xs font-medium text-[var(--ink-muted)]">
            {digitalZoom.toFixed(1)}×
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={paused || digitalZoom >= MAX_DIGITAL_ZOOM}
            onClick={() => setDigital(digitalZoom + 0.3)}
            className="h-10 w-10 rounded-lg text-lg font-semibold text-[var(--ink)] active:bg-[var(--surface)] disabled:opacity-40"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-1">
          {zoomCaps ? (
            <button
              type="button"
              disabled={!streaming || opticalZoom >= zoomCaps.max}
              onClick={() =>
                applyOpticalZoom(opticalZoom + Math.max(zoomCaps.step, 0.5))
              }
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--ink)] disabled:opacity-40"
            >
              Lens {opticalZoom.toFixed(1)}×
            </button>
          ) : null}
          {torchSupported ? (
            <button
              type="button"
              aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
              aria-pressed={torchOn}
              disabled={!streaming}
              onClick={toggleTorch}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${
                torchOn
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--ink)]"
              }`}
            >
              {torchOn ? "Flash on" : "Flash"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : open ? (
        <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
          {paused
            ? "Scanner paused — finish quantity first."
            : "Hold the small QR inside the box. Pinch or tap + to zoom."}
        </p>
      ) : null}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 sm:p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
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
    <div
      className={
        open
          ? "fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center"
          : "hidden"
      }
      aria-hidden={!open}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-muted)]"
          >
            Close
          </button>
        </div>
        {camera}
      </div>
    </div>
  );
}
