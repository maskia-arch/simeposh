import { verifyFeedbackToken, generateFeedbackToken } from './token';
import { createClient } from '@/lib/supabase/server';

// Sliding-window in-memory rate limiter per IP
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    });
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks sliding-window rate limit for a key (e.g. IP + endpoint)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Extracts client IP from headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown-ip';
}

/**
 * Strips all HTML/XML tags, script blocks, and dangerous characters to protect against XSS
 */
export function sanitizeText(input: string | null | undefined, maxLength = 2000): string {
  if (!input) return '';
  return String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove entire script blocks
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove entire style blocks
    .replace(/<[^>]*>?/gm, '') // Remove all HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // Remove ASCII control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Safely sanitizes a display name, permitting only human name characters
 */
export function sanitizeDisplayName(nameInput: string | null | undefined, defaultName = 'Anonym'): string {
  const cleaned = sanitizeText(nameInput, 50)
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s.,_-]/g, '') // Permitted letters, numbers, spaces, dots, commas, dashes
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.toLowerCase() === 'anonym' || cleaned.toLowerCase() === 'anonymous') {
    return defaultName;
  }
  return cleaned;
}

export interface VerificationContext {
  token?: string | null;
  hasCheckoutSessionProof?: boolean;
}

/**
 * Verifies that the caller has legitimate authority to view or review an order.
 * Accepts:
 * 1. Valid HMAC Token for this order & customer email.
 * 2. Active logged-in Supabase session matching customer_email or user_id.
 * 3. Verified checkout session proof (e.g. valid crypto session UUID or direct checkout ref).
 */
export async function verifyOrderAuthorization(
  order: {
    id: string;
    customer_email?: string | null;
    user_id?: string | null;
  },
  context: VerificationContext
): Promise<{ authorized: boolean; reason?: string; verifiedToken: string }> {
  const verifiedToken = generateFeedbackToken(order.id, order.customer_email);

  // 1. Path 1: Cryptographic HMAC token match
  if (context.token && verifyFeedbackToken(context.token, order.id, order.customer_email)) {
    return { authorized: true, verifiedToken };
  }

  // 2. Path 2: Checkout session proof (user arrived from their active payment completion flow)
  if (context.hasCheckoutSessionProof) {
    return { authorized: true, verifiedToken };
  }

  // 3. Path 3: Logged-in Supabase Auth User
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const emailMatches =
        order.customer_email &&
        user.email &&
        order.customer_email.trim().toLowerCase() === user.email.trim().toLowerCase();
      const idMatches = order.user_id && user.id && order.user_id === user.id;

      if (emailMatches || idMatches) {
        return { authorized: true, verifiedToken };
      }
    }
  } catch {
    // Auth check fallback
  }

  return {
    authorized: false,
    reason: 'Authentifizierung erforderlich: Bitte nutze den persönlichen Link aus deiner E-Mail oder melde dich in deinem Kundenkonto an.',
    verifiedToken,
  };
}
