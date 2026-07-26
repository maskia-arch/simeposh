/**
 * Helper to construct the secure, standalone eSIM overview & installation URL.
 *
 * In production: https://esim.puresim.net/{token}/{iccid}
 * In local development: http://localhost:3000/esim-overview/{token}/{iccid}
 */
export function getEsimOverviewUrl(token?: string | null, iccid?: string | null): string {
  if (!token || !iccid) return '';

  const cleanToken = token.trim();
  const cleanIccid = iccid.trim();
  if (!cleanToken || !cleanIccid) return '';

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';
  const appUrl = rawAppUrl.replace(/\/$/, '');
  const isLocal = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

  if (isLocal) {
    return `${appUrl}/esim-overview/${encodeURIComponent(cleanToken)}/${encodeURIComponent(cleanIccid)}`;
  }

  try {
    const urlObj = new URL(appUrl);
    let hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    if (!hostname) hostname = 'puresim.net';
    const esimDomain = hostname.startsWith('esim.') ? hostname : `esim.${hostname}`;
    return `https://${esimDomain}/${encodeURIComponent(cleanToken)}/${encodeURIComponent(cleanIccid)}`;
  } catch {
    return `https://esim.puresim.net/${encodeURIComponent(cleanToken)}/${encodeURIComponent(cleanIccid)}`;
  }
}
