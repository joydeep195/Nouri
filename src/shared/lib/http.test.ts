import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJson, HttpError } from './http';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetchJson', () => {
  it('times out a hanging request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        });
      }),
    );
    await expect(fetchJson('https://example.test', { timeoutMs: 20, retries: 0 })).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('passes through a caller abort without retrying', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    vi.stubGlobal('fetch', fetchMock);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(fetchJson('https://example.test', { signal: ctrl.signal })).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports non-OK statuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 403 }))),
    );
    await expect(fetchJson('https://example.test')).rejects.toBeInstanceOf(HttpError);
  });
});
