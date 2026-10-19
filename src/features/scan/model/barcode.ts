// Barcode + QR detection. Uses the phone's built-in detector when it has one (Android Chrome),
// otherwise a WebAssembly build of ZXing (iPhone Safari), served from our own site so it
// also works offline.

import {
  BarcodeDetector as ZXingDetector,
  prepareZXingModule,
  type BarcodeFormat,
  type DetectedBarcode,
} from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

prepareZXingModule({
  overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
});

const FORMATS: BarcodeFormat[] = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];

export interface Detector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface NativeDetectorClass {
  new (options: { formats: BarcodeFormat[] }): Detector;
  getSupportedFormats(): Promise<BarcodeFormat[]>;
}

let detectorPromise: Promise<Detector> | undefined;

export function getDetector(): Promise<Detector> {
  detectorPromise ??= (async () => {
    const Native = (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
    if (Native && (Native as unknown) !== ZXingDetector) {
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
export async function detectFromImage(file: Blob): Promise<string | null> {
  const detector = await getDetector();
  const bitmap = await createImageBitmap(file);
  try {
    const results = await detector.detect(bitmap);
    return results[0]?.rawValue ?? null;
  } finally {
    bitmap.close();
  }
}

export async function openCamera(): Promise<MediaStream> {
  // mediaDevices is missing on insecure (http) pages and some older browsers, despite the DOM types.
  const media = (navigator as { mediaDevices?: Partial<MediaDevices> }).mediaDevices;
  if (typeof media?.getUserMedia !== 'function') {
    throw new DOMException('This browser cannot open the camera.', 'NotSupportedError');
  }
  return media.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
}

export function cameraErrorMessage(err: unknown): string {
  const name = err instanceof Error || err instanceof DOMException ? err.name : '';
  switch (name) {
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
