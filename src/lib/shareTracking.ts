/**
 * Build the public tracking URL for a given order tracking code.
 */
export function buildTrackingUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/t/${code}`;
}

/**
 * Share a tracking link via Web Share API (mobile) with a clipboard fallback.
 * Returns true if shared/copied, false on failure.
 */
export async function shareTrackingLink(code: string, itemDescription?: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = buildTrackingUrl(code);
  const text = itemDescription
    ? `Track your delivery (${itemDescription}) on Droply: ${url}`
    : `Track your delivery on Droply: ${url}`;

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title: 'Droply Tracking', text, url });
      return 'shared';
    } catch (err) {
      // User cancelled — fall through to clipboard
      if ((err as Error).name === 'AbortError') return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
