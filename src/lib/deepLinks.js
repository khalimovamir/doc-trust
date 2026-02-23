/**
 * Doc Trust - Deep link parsing
 * Supports doctrust://offer/50 and ai-lawyer://offer/50 (and query params ?id= or ?offerId=).
 */

export function parseOfferDeepLink(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = url.replace(/^doctrust:\/\//i, 'https://doctrust/').replace(/^ai-lawyer:\/\//i, 'https://ai-lawyer/');
    const parsed = new URL(u);
    const path = parsed.pathname.replace(/^\/+/, '');
    const segs = path.split('/');
    if (segs[0] === 'offer') {
      const offerId = segs[1] || parsed.searchParams.get('id') || parsed.searchParams.get('offerId');
      return offerId || null;
    }
    return null;
  } catch {
    return null;
  }
}
