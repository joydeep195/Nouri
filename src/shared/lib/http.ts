// A small hardened fetch wrapper for calls to outside services.
//  - timeout, and one retry with backoff for network errors / 5xx
//  - never sends cookies or a referrer
//  - refuses oversized responses before parsing them

export class HttpError extends Error {
  override name = 'HttpError';
  constructor(
    message: string,
    readonly status: number | null,
    readonly kind: 'network' | 'timeout' | 'status' | 'too-large' | 'parse',
  ) {
    super(message);
  }
}

export interface FetchJsonOptions {
  signal?: AbortSignal | undefined;
  timeoutMs?: number;
  retries?: number;
  maxBytes?: number;
  /** Treat these statuses as a normal "empty" result instead of an error (e.g. 404 = not found). */
  okStatuses?: number[];
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(signal.reason as Error);
      },
      { once: true },
    );
  });

/** Fetches JSON. Resolves `{ status, data }`; data is undefined for an okStatuses response. */
export async function fetchJson(
  url: string,
  { signal, timeoutMs = 8000, retries = 1, maxBytes = 2_000_000, okStatuses = [] }: FetchJsonOptions = {},
): Promise<{ status: number; data: unknown }> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      ctrl.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, timeoutMs);
    const onAbort = () => {
      ctrl.abort(signal?.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' },
      });
      if (okStatuses.includes(res.status)) return { status: res.status, data: undefined };
      if (res.status >= 500 && attempt < retries) {
        await sleep(600 * (attempt + 1), signal);
        continue;
      }
      if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status, 'status');

      const length = Number(res.headers.get('content-length') ?? 0);
      if (length > maxBytes) throw new HttpError('Response too large', res.status, 'too-large');
      const body = await res.text();
      if (body.length > maxBytes) throw new HttpError('Response too large', res.status, 'too-large');
      try {
        return { status: res.status, data: JSON.parse(body) as unknown };
      } catch {
        throw new HttpError('Invalid JSON', res.status, 'parse');
      }
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof HttpError) throw err;
      const timedOut = ctrl.signal.aborted;
      if (attempt < retries) {
        await sleep(600 * (attempt + 1), signal);
        continue;
      }
      throw new HttpError(timedOut ? 'Request timed out' : 'Network error', null, timedOut ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}
