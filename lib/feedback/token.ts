import crypto from 'crypto';

function getSecret(): string {
  return (
    process.env.FEEDBACK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SHOP_WEBHOOK_SECRET ||
    process.env.CRON_SECRET ||
    'puresim-feedback-salt-2026-production'
  );
}

/**
 * Generates a tamper-proof cryptographic HMAC-SHA256 token for an order.
 * Ensures that only the legitimate owner of the order or recipient of the email
 * can submit or verify feedback.
 */
export function generateFeedbackToken(orderId: string, email?: string | null): string {
  const normalizedOrderId = (orderId || '').trim();
  const normalizedEmail = (email || '').trim().toLowerCase();
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${normalizedOrderId}:${normalizedEmail}`)
    .digest('hex');
}

/**
 * Validates whether a token matches the order and customer email.
 * Uses timingSafeEqual to protect against timing side-channel attacks.
 */
export function verifyFeedbackToken(
  token: string | null | undefined,
  orderId: string,
  email?: string | null
): boolean {
  if (!token || typeof token !== 'string') return false;
  
  const expected = generateFeedbackToken(orderId, email);
  try {
    const tokenBuf = Buffer.from(token, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}
