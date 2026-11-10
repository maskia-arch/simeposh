/**
 * Resolves the canonical, secure public base URL of the website.
 * Prevents internal bindings like 0.0.0.0:4444 or 127.0.0.1 from leaking into emails & redirects.
 */
export function getPublicBaseUrl(req?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;

  if (envUrl && !envUrl.includes('0.0.0.0') && !envUrl.includes('127.0.0.1')) {
    if (!envUrl.includes('localhost') || process.env.NODE_ENV !== 'production') {
      return envUrl.replace(/\/$/, '');
    }
  }

  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    let host = forwardedHost || req.headers.get('host') || 'puresim.net';

    if (
      host.includes('0.0.0.0') ||
      host.includes('127.0.0.1') ||
      (host.includes('localhost') && process.env.NODE_ENV === 'production')
    ) {
      host = 'puresim.net';
    }

    const proto = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : forwardedProto;
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  return 'https://puresim.net';
}

/**
 * Returns the canonical URL path for a tariff detail page.
 * Strictly uses the exact active package_code, safely encoded as a URL path segment.
 * Includes localized language prefix for non-de locales (de has no prefix).
 */
export function getTariffCanonicalPath(packageCode: string, locale: string = 'de'): string {
  const cleanCode = (packageCode || '').trim();
  const isDe = !locale || locale === 'de';
  const prefix = isDe ? '' : `/${locale.toLowerCase()}`;
  if (!cleanCode) {
    return `${prefix}/tariffs`;
  }
  return `${prefix}/tariffs/${encodeURIComponent(cleanCode)}`;
}

/**
 * Helper to construct the secure, standalone eSIM overview & installation URL.
 *
 * In production: https://esim.puresim.net/s/{token}
 * In local development: http://localhost:3000/s/{token}
 */
export function getEsimOverviewUrl(token?: string | null, _legacyIccid?: string | null): string {
  if (!token) return '';

  const cleanToken = token.trim();
  if (!cleanToken) return '';

  // If token is already a full URL
  if (cleanToken.startsWith('http://') || cleanToken.startsWith('https://')) {
    return cleanToken;
  }

  const appUrl = getPublicBaseUrl();
  const isLocal = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

  if (isLocal) {
    return `${appUrl}/s/${encodeURIComponent(cleanToken)}`;
  }

  try {
    const urlObj = new URL(appUrl);
    let hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    if (!hostname) hostname = 'puresim.net';
    const esimDomain = hostname.startsWith('esim.') ? hostname : `esim.${hostname}`;
    return `https://${esimDomain}/s/${encodeURIComponent(cleanToken)}`;
  } catch {
    return `https://esim.puresim.net/s/${encodeURIComponent(cleanToken)}`;
  }
}

