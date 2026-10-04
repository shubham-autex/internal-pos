import { BarcodeDetector, type BarcodeFormat } from "barcode-detector/ponyfill";

export const SCAN_FORMATS: BarcodeFormat[] = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
];

const DETECT_WIDTH = 720;

export function createBarcodeDetector() {
  return new BarcodeDetector({ formats: SCAN_FORMATS });
}

/**
 * Crop the center of a live video frame and upscale it so small QR modules
 * are large enough for the detector. `zoom` is digital (1 = full frame).
 */
export function drawZoomedFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  zoom: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  const safeZoom = Math.max(1, Math.min(5, zoom));
  const cropW = Math.max(48, vw / safeZoom);
  const cropH = Math.max(48, vh / safeZoom);
  const sx = (vw - cropW) / 2;
  const sy = (vh - cropH) / 2;
  const scale = Math.max(1, DETECT_WIDTH / cropW);
  const outW = Math.round(cropW * scale);
  const outH = Math.round(cropH * scale);

  if (canvas.width !== outW) canvas.width = outW;
  if (canvas.height !== outH) canvas.height = outH;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);
  return canvas;
}
