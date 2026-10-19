// URL allow-listing for anything that came from outside the app (QR codes, database records).

/** Product image hosts we load pictures from. Keep in sync with the CSP img-src. */
export const IMAGE_HOSTS: readonly string[] = ['images.openfoodfacts.org', 'static.openfoodfacts.org'];

/** An https link that is safe to offer to open, or null (http, javascript:, credentials in URL, junk…). */
export function toSafeExternalUrl(raw: string | null | undefined): URL | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null;
    return url;
  } catch {
    return null;
  }
}

/** The image URL if it is https on an allowed host, otherwise null (a placeholder is shown instead). */
export function toSafeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && IMAGE_HOSTS.includes(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
