export interface ExpirationInfo {
  validityDays:         number; // 90 for guest, 730 for registered
  isRegistered:         boolean;
  expiryDate:           Date;
  daysRemaining:        number;
  isExpired:            boolean;
  expiryDateFormatted:  string;
}

/**
 * Compute expiration details for an eSIM Cash account.
 * Guest/Unregistered: 90 days validity.
 * Registered User: 730 days validity (2 years).
 */
export function getAccountExpirationInfo(account: {
  user_id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}, locale: string = 'de'): ExpirationInfo {
  const isRegistered = Boolean(account.user_id);
  const validityDays = isRegistered ? 730 : 90;

  const baseDateStr = account.updated_at || account.created_at || new Date().toISOString();
  const baseDate = new Date(baseDateStr);

  const expiryDate = new Date(baseDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0;

  const normLoc = locale.toLowerCase().slice(0, 2);
  const expiryDateFormatted = expiryDate.toLocaleDateString(normLoc === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return {
    validityDays,
    isRegistered,
    expiryDate,
    daysRemaining,
    isExpired,
    expiryDateFormatted,
  };
}
