// Barcode + QR detection. Uses the phone's built-in detector when it has one (Android Chrome),
// otherwise a WebAssembly build of ZXing (iPhone Safari), served from our own site so it
// also works offline.

import { BarcodeDetector as ZXingDetector, prepareZXingModule } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

prepareZXingModule({
  overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
});

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];
let detectorPromise;

export function getDetector() {
  detectorPromise ??= (async () => {
    const Native = globalThis.BarcodeDetector;
    if (Native && Native !== ZXingDetector) {
      try {
        const supported = await Native.getSupportedFormats();
        if (supported.includes('ean_13') && supported.includes('qr_code')) {
          return new Native({ formats: FORMATS.filter((f) => supported.includes(f)) });
        }
      } catch {
        // fall through to ZXing
      }
    }
    return new ZXingDetector({ formats: FORMATS });
  })();
  return detectorPromise;
}

/** Reads a barcode from a still photo (used when live camera access isn't available). */
export async function detectFromImage(file) {
  const detector = await getDetector();
  const bitmap = await createImageBitmap(file);
  try {
    const results = await detector.detect(bitmap);
    return results[0]?.rawValue ?? null;
  } finally {
    bitmap.close?.();
  }
}

export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error('This browser cannot open the camera.');
    err.name = 'NotSupportedError';
    throw err;
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
}

export function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow camera access for this site in your browser settings, or use a photo instead.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return "We couldn't find a camera on this device.";
    case 'NotReadableError':
      return 'The camera is being used by another app. Close it and try again.';
    case 'NotSupportedError':
      return 'This browser cannot open the camera. Try Safari or Chrome, or use a photo instead.';
    default:
      return "Couldn't start the camera. Try again, or use a photo instead.";
  }
}
