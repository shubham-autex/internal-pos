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

/** Stable constraints so the scanner does not restart the stream on every render. */
export function getCameraConstraints(): MediaTrackConstraints {
  const deviceId = getSavedCameraDeviceId();
  if (deviceId) {
    return {
      deviceId: { ideal: deviceId },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };
  }
  return {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };
}
