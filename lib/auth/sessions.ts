/**
 * Helpers for user session display and management.
 */

export function parseUserAgent(uaString: string | null | undefined, locale = 'de'): {
  browser: string;
  os: string;
  device: string;
  description: string;
} {
  const ua = uaString || '';

  let os = locale === 'de' ? 'Unbekanntes System' : 'Unknown System';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/iPad/i.test(ua)) os = 'iPad (iPadOS)';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Opera|OPR\//i.test(ua)) browser = 'Opera';

  let device = 'Desktop';
  if (/iPhone|Android.*Mobile|Mobile/i.test(ua)) device = locale === 'de' ? 'Smartphone' : 'Mobile';
  else if (/iPad|Tablet/i.test(ua)) device = 'Tablet';

  const preposition = locale === 'de' ? 'unter' : 'on';
  return {
    browser,
    os,
    device,
    description: `${browser} ${preposition} ${os}`,
  };
}

export function maskIp(ip: string | null | undefined): string {
  if (!ip || typeof ip !== 'string') return '***.***.***.***';
  const clean = ip.trim();

  // IPv4
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }

  // IPv6
  if (clean.includes(':')) {
    const parts = clean.split(':');
    return `${parts.slice(0, 2).join(':')}:***:***`;
  }

  return '***.***';
}
