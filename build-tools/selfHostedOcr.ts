// Serves the label reader (Tesseract.js worker, WebAssembly core and English model) from our own
// origin instead of a CDN, so no third-party code ever runs in the app.
//   dev:   files are streamed straight from node_modules
//   build: files are copied into dist/ocr/<version>/
import { createReadStream, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);
const pkgDir = (name: string) => dirname(require.resolve(`${name}/package.json`));
const tesseractVersion = (
  JSON.parse(readFileSync(join(pkgDir('tesseract.js'), 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

/** Public path (relative to the app root) of the OCR assets, e.g. "ocr/7.0.0/". */
export const OCR_PATH = `ocr/${tesseractVersion}/`;

interface Asset {
  src: string;
  dest: string;
  type: string;
}

function assets(): Asset[] {
  const core = pkgDir('tesseract.js-core');
  const js = 'text/javascript';
  return [
    { src: join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), dest: 'worker.min.js', type: js },
    // LSTM-only builds; the worker picks one based on the device's WebAssembly SIMD support.
    ...[
      'tesseract-core-lstm.wasm.js',
      'tesseract-core-simd-lstm.wasm.js',
      'tesseract-core-relaxedsimd-lstm.wasm.js',
    ].map((f) => ({ src: join(core, f), dest: `core/${f}`, type: js })),
    {
      src: join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'),
      dest: 'lang/eng.traineddata.gz',
      type: 'application/octet-stream',
    },
  ].map((a) => ({ ...a, dest: OCR_PATH + a.dest }));
}

export function selfHostedOcr(): Plugin {
  const files = assets();
  return {
    name: 'nouri:self-hosted-ocr',
    config: () => ({ define: { __OCR_PATH__: JSON.stringify(OCR_PATH) } }),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? '').split('?')[0] ?? '').replace(/^\//, '');
        const asset = files.find((f) => f.dest === path);
        if (!asset) {
          next();
          return;
        }
        res.setHeader('Content-Type', asset.type);
        createReadStream(asset.src).pipe(res);
      });
    },
    generateBundle() {
      for (const f of files) this.emitFile({ type: 'asset', fileName: f.dest, source: readFileSync(f.src) });
    },
  };
}
