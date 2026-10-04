const DEVICE_KEY = "pos.camera.deviceId";

export function getSavedCameraDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

export function saveCameraDeviceId(deviceId: string) {
  if (typeof window === "undefined" || !deviceId) return;
  try {
    sessionStorage.setItem(DEVICE_KEY, deviceId);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** 720p is enough for cropped small-QR detection and is lighter on phones. */
export function getCameraConstraints(): MediaTrackConstraints {
  const deviceId = getSavedCameraDeviceId();
  const size = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    aspectRatio: { ideal: 16 / 9 },
  };

  if (deviceId) {
    return {
      deviceId: { ideal: deviceId },
      ...size,
    };
  }
  return {
    facingMode: { ideal: "environment" },
    ...size,
  };
}

export async function applyPreferredFocus(track: MediaStreamTrack) {
  const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
    focusMode?: string[];
  };
  const modes = caps?.focusMode;
  if (!modes?.length) return;
  const preferred = modes.includes("continuous")
    ? "continuous"
    : modes.includes("auto")
      ? "auto"
      : null;
  if (!preferred) return;
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: preferred } as MediaTrackConstraintSet],
    });
  } catch {
    // Some browsers expose the capability but reject applyConstraints.
  }
}

/** Prefer a modest optical zoom so small printed codes fill more of the sensor. */
export function pickDefaultOpticalZoom(min: number, max: number) {
  if (max <= min) return min;
  const preferred = Math.min(max, Math.max(min, 2));
  return preferred;
}
