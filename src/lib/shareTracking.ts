/**
 * Build the public tracking URL for a given order tracking code.
 */
const DEFAULT_PUBLIC_APP_URL = 'https://droplixmumbai.vercel.app';

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, '');
}

function isLocalOrAppOrigin(origin: string) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (
      url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname === '0.0.0.0'
      || url.protocol === 'capacitor:'
      || url.protocol === 'ionic:'
      || url.protocol === 'file:'
    );
  } catch {
    return true;
  }
}

export function getPublicAppOrigin(): string {
  const configured = normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL || '');
  if (configured) return configured;

  const currentOrigin = typeof window !== 'undefined' ? normalizeOrigin(window.location.origin) : '';
  if (!isLocalOrAppOrigin(currentOrigin)) return currentOrigin;

  return DEFAULT_PUBLIC_APP_URL;
}

export function buildTrackingUrl(code: string): string {
  return `${getPublicAppOrigin()}/t/${encodeURIComponent(code.trim().toUpperCase())}`;
}

/**
 * Share a tracking link via Web Share API (mobile) with a clipboard fallback.
 * Returns true if shared/copied, false on failure.
 */
export async function shareTrackingLink(code: string, itemDescription?: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = buildTrackingUrl(code);
  const text = itemDescription
    ? `Track your delivery (${itemDescription}) on Droplix: ${url}`
    : `Track your delivery on Droplix: ${url}`;

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title: 'Droplix Tracking', text, url });
      return 'shared';
    } catch (err) {
      // User cancelled — fall through to clipboard
      if ((err as Error).name === 'AbortError') return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
