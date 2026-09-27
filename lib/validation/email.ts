/**
 * PureSim Checkout Email Validation
 * Shared between client components and server route handlers.
 *
 * Rules:
 * - Trims leading and trailing whitespace
 * - Maximum 254 characters (RFC 5321)
 * - Exactly one '@'
 * - Non-empty local part before '@' without whitespace
 * - Domain part containing at least one '.'
 * - TLD consisting of at least 2 letters (a-z)
 * - No internal whitespace
 */

export interface EmailValidationResult {
  isValid: boolean;
  normalized: string;
  errorKey?: 'empty' | 'invalid';
}

export function validateEmail(rawEmail: unknown): EmailValidationResult {
  if (typeof rawEmail !== 'string') {
    return { isValid: false, normalized: '', errorKey: 'empty' };
  }

  const normalized = rawEmail.trim();
  if (normalized.length === 0) {
    return { isValid: false, normalized: '', errorKey: 'empty' };
  }

  if (normalized.length > 254) {
    return { isValid: false, normalized, errorKey: 'invalid' };
  }

  // Reject internal spaces
  if (/\s/.test(normalized)) {
    return { isValid: false, normalized, errorKey: 'invalid' };
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { isValid: false, normalized, errorKey: 'invalid' };
  }

  const [local, domain] = parts;
  if (!local || local.length === 0 || !domain || domain.length === 0) {
    return { isValid: false, normalized, errorKey: 'invalid' };
  }

  // Domain cannot start or end with '.' and must have at least one '.'
  if (domain.startsWith('.') || domain.endsWith('.') || !domain.includes('.')) {
    return { isValid: false, normalized, errorKey: 'invalid' };
  }

  // Check TLD (last domain segment) has at least 2 alpha characters
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, normalized, errorKey: 'invalid' };
  }

  // Standard safe email pattern check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalized)) {
    return { isValid: false, normalized, errorKey: 'invalid' };
  }

  return {
    isValid: true,
    normalized: normalized.toLowerCase(),
  };
}

export function isValidEmail(email: unknown): boolean {
  return validateEmail(email).isValid;
}
