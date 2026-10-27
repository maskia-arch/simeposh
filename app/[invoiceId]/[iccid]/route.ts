import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseOrderIds(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => String(s).trim());
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(s => String(s).trim());
      return [String(parsed).trim()];
    } catch {
      return [trimmed];
    }
  }
  return [String(raw).trim()];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string; iccid: string }> }
) {
  const { invoiceId, iccid } = await params;
  if (!invoiceId || !iccid) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const cleanInvoiceId = invoiceId.trim();
  const cleanIccid = iccid.trim();
  const db = createServiceClient();
  let matchingOrder: any = null;

  // 1. Look up via crypto session (invoiceId == crypto_sessions.id)
  if (isUuid(cleanInvoiceId)) {
    try {
      const { data: session } = await db
        .from('crypto_sessions')
        .select('order_ids')
        .eq('id', cleanInvoiceId)
        .maybeSingle();

      if (session && session.order_ids) {
        const orderIds = parseOrderIds(session.order_ids).filter(isUuid);
        if (orderIds.length > 0) {
          const { data: orders } = await db
            .from('orders')
            .select('id, setup_token, status')
            .in('id', orderIds)
            .eq('iccid', cleanIccid);

          if (orders && orders.length > 0) {
            matchingOrder = orders.find(o => ['completed', 'paid', 'provisioning'].includes(o.status)) || orders[0];
          }
        }
      }
    } catch (err) {
      console.error('[DirectSetupRedirect] Session lookup error:', err);
    }
  }

  // 2. Look up via checkout_ref
  if (!matchingOrder) {
    try {
      const { data: orders } = await db
        .from('orders')
        .select('id, setup_token, status')
        .eq('checkout_ref', cleanInvoiceId)
        .eq('iccid', cleanIccid);

      if (orders && orders.length > 0) {
        matchingOrder = orders.find(o => ['completed', 'paid', 'provisioning'].includes(o.status)) || orders[0];
      }
    } catch (err) {
      console.error('[DirectSetupRedirect] Checkout ref lookup error:', err);
    }
  }

  // 3. Look up via order ID directly (invoiceId == orders.id)
  if (!matchingOrder && isUuid(cleanInvoiceId)) {
    try {
      const { data: orders } = await db
        .from('orders')
        .select('id, setup_token, status')
        .eq('id', cleanInvoiceId)
        .eq('iccid', cleanIccid);

      if (orders && orders.length > 0) {
        matchingOrder = orders.find(o => ['completed', 'paid', 'provisioning'].includes(o.status)) || orders[0];
      }
    } catch (err) {
      console.error('[DirectSetupRedirect] Order ID lookup error:', err);
    }
  }

  // 4. Look up via ICCID directly
  if (!matchingOrder) {
    try {
      const { data: orders } = await db
        .from('orders')
        .select('id, setup_token, status')
        .eq('iccid', cleanIccid);

      if (orders && orders.length > 0) {
        matchingOrder = orders.find(o => ['completed', 'paid', 'provisioning'].includes(o.status)) || orders[0];
      }
    } catch (err) {
      console.error('[DirectSetupRedirect] Direct ICCID lookup error:', err);
    }
  }

  if (!matchingOrder || !matchingOrder.setup_token) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 301 Permanent Redirect to opaque setup token URL without ICCID
  const targetUrl = new URL(`/s/${matchingOrder.setup_token}`, request.url);
  return NextResponse.redirect(targetUrl, 301);
}
