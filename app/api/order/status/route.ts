/**
 * GET /api/order/status?ref=<checkout_ref | order_id | crypto_session_id>
 *
 * Public lookup of a checkout's orders by unguessable full UUID reference.
 * Used by /order page to poll until all eSIMs are provisioned.
 *
 * Security: Strictly requires exact full UUID references. Prefix and short-ID
 * queries return 404 without leaking order existence.
 * Rate limited to 30 requests per minute per IP.
 */
import { NextResponse } from 'next/server';
import { checkOrderRateLimit } from '@/lib/rate-limit';
import { lookupOrderData } from '@/lib/order-lookup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref')?.trim();

  // Rate Limiting (30 requests/min per IP)
  const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
  const { allowed, retryAfter } = checkOrderRateLimit(clientIp);
  if (!allowed) {
    const rateRes = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    rateRes.headers.set('Retry-After', String(retryAfter || 60));
    rateRes.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    return rateRes;
  }

  // Lookup order data via Single Source of Truth helper
  const orderData = await lookupOrderData(ref);

  if (!orderData) {
    const notFoundRes = NextResponse.json({ error: 'Order not found' }, { status: 404 });
    notFoundRes.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    return notFoundRes;
  }

  const res = NextResponse.json(orderData);
  res.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  return res;
}
