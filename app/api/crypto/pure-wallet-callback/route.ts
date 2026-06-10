import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrders } from '@/lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-pure-wallet-signature') || '';

    const secret = process.env.SHOP_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[pure-wallet Webhook] SHOP_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Compute and verify HMAC-SHA256 signature
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (computedSignature !== signatureHeader) {
      console.warn('[pure-wallet Webhook] Invalid signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      order_id: string;
      status: 'pending' | 'paid' | 'partially_paid' | 'expired' | 'detected';
      amount_ltc: number;
      received_amount: number;
      tx_hash: string | null;
      confirmations?: number;
      paid_at: string | null;
    };

    const { order_id, status, received_amount, tx_hash, paid_at, confirmations } = payload;
    console.log(`[pure-wallet Webhook] Received status update for order ${order_id}: ${status} (received: ${received_amount} LTC, confirmations: ${confirmations ?? 0})`);

    const db = createServiceClient();

    // 1. Fetch current session status
    const { data: session, error: fetchErr } = await db
      .from('crypto_sessions')
      .select('*')
      .eq('id', order_id)
      .maybeSingle();

    if (fetchErr || !session) {
      console.error(`[pure-wallet Webhook] Session ${order_id} not found in DB`);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2. Update session status
    const updatePayload: Record<string, unknown> = {
      status,
      received_amount,
      tx_hash,
      paid_at: paid_at || (status === 'paid' ? new Date().toISOString() : null),
    };
    if (confirmations !== undefined) {
      updatePayload.confirmations = confirmations;
    }

    const { error: updateErr } = await db
      .from('crypto_sessions')
      .update(updatePayload as any)
      .eq('id', order_id);

    if (updateErr) {
      console.error(`[pure-wallet Webhook] Failed to update session ${order_id} in DB:`, updateErr.message);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // 3. Fulfill orders if transition to 'paid' (only if it wasn't already marked paid)
    if (status === 'paid' && session.status !== 'paid') {
      console.log(`[pure-wallet Webhook] Confirming payment for orders: ${session.order_ids.join(', ')}`);
      
      const { error: ordersErr } = await db
        .from('orders')
        .update({
          status: 'paid',
          payment_confirmed_at: new Date().toISOString(),
        })
        .in('id', session.order_ids)
        .neq('status', 'completed');

      if (ordersErr) {
        console.error(`[pure-wallet Webhook] Failed to update orders to paid status:`, ordersErr.message);
      } else {
        // Trigger background provisioning & emails
        fulfillOrders(db, session.order_ids).then((results) => {
          console.log(`[pure-wallet Webhook] Fulfillment completed:`, JSON.stringify(results));
        }).catch((err) => {
          console.error(`[pure-wallet Webhook] Fulfillment error:`, err);
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pure-wallet Webhook Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
