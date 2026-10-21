import 'server-only';

/**
 * Returns the configured admin email strictly from server environment variable ADMIN_EMAIL.
 * Returns null if not configured (never falls back to any hardcoded email).
 */
export function getAdminEmail(): string | null {
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return envEmail || null;
}

/**
 * Checks whether the given user object has admin privileges.
 * 
 * Strict Server-Side Rule:
 * Admin is ONLY:
 *  1. A user with app_metadata.role === 'admin'
 *  2. A user whose email strictly matches process.env.ADMIN_EMAIL (if configured)
 * 
 * NEVER checks user_metadata, as user_metadata can be modified by customers in Supabase!
 */
export function isUserAdmin(
  user: {
    email?: string | null;
    app_metadata?: { role?: string; [key: string]: any } | null;
  } | null | undefined
): boolean {
  if (!user) return false;

  // 1. Trusted app_metadata check (only settable by Supabase service role / admin)
  if (user.app_metadata && user.app_metadata.role === 'admin') {
    return true;
  }

  // 2. Server environment variable check
  const adminEmail = getAdminEmail();
  if (adminEmail && user.email && user.email.trim().toLowerCase() === adminEmail) {
    return true;
  }

  return false;
}

/**
 * Checks whether an email matches the configured admin email for rate limiting / alerts.
 */
export function isSpecialAdminAccount(email?: string | null): boolean {
  if (!email) return false;
  const adminEmail = getAdminEmail();
  if (!adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail;
}
