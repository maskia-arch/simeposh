/**
 * Utility functions for generating platform-specific eSIM quick installation links
 * and handling cross-platform user interactions (iOS Safari Universal Links, Android Universal Links, Desktop fallback).
 */

export type DeviceOs = 'ios' | 'android' | 'desktop';

/**
 * Returns the raw GSMA LPA string format: LPA:1$<smdpAddress>$<activationCode>
 */
export function getRawLpaString(smdpAddress: string, activationCode: string): string {
  const smdp = (smdpAddress || '').trim();
  const code = (activationCode || '').trim();
  if (!smdp || !code) return '';
  return `LPA:1$${smdp}$${code}`;
}

/**
 * Generates the official platform-specific eSIM quick installation link.
 * 
 * - iOS (iOS 17.4+): https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA:1$...
 * - Android (Android 10+): https://esimsetup.android.com/esim_qrcode_provisioning?carddata=LPA:1$...
 * - Universal fallback: https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA:1$...
 */
export function getEsimQuickInstallLink(
  smdpAddress: string,
  activationCode: string,
  os: DeviceOs | string = 'desktop'
): string {
  const rawLpa = getRawLpaString(smdpAddress, activationCode);
  if (!rawLpa) return '#';

  const encodedLpa = encodeURIComponent(rawLpa);

  if (os === 'android') {
    return `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${encodedLpa}`;
  }

  // iOS Universal Link (works on iOS 17.4+ Safari and external links)
  // Also serves as the primary fallback link for universal mobile handlers
  return `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodedLpa}`;
}

/**
 * Helper to detect OS at runtime on client browser
 */
export function detectDeviceOs(): DeviceOs {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}
