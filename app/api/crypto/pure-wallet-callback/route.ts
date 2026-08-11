import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrders } from '@/lib/fulfillment';
import { isUuid } from '@/lib/utils';

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

    const sigBuffer = Buffer.from(signatureHeader);
    const compBuffer = Buffer.from(computedSignature);

    if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
      console.warn('[pure-wallet Webhook] Invalid signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      order_id: string;
      status: 'pending' | 'paid' | 'partially_paid' | 'expired' | 'detected' | 'cancelled';
      amount_ltc: number;
      received_amount: number;
      tx_hash: string | null;
      confirmations?: number;
      paid_at: string | null;
    };

    const { order_id, status, received_amount, tx_hash, paid_at, confirmations } = payload;
    console.log(`[pure-wallet Webhook] Received status update for order ${order_id}: ${status} (received: ${received_amount} LTC, confirmations: ${confirmations ?? 0})`);

    if (!isUuid(order_id)) {
      console.error(`[pure-wallet Webhook] Invalid UUID format for order_id: ${order_id}`);
      return NextResponse.json({ error: 'Invalid order_id format' }, { status: 400 });
    }

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

    let effectiveStatus: 'pending' | 'paid' | 'partially_paid' | 'expired' | 'detected' | 'cancelled' = status;

    if (status === 'partially_paid' && session.crypto_amount > 0) {
      let minPaymentPct = 98;
      try {
        const { data: coinRow } = await db
          .from('crypto_coins')
          .select('min_payment_pct')
          .eq('code', session.coin.toUpperCase())
          .maybeSingle();
        if (coinRow && typeof coinRow.min_payment_pct === 'number' && coinRow.min_payment_pct > 0) {
          minPaymentPct = coinRow.min_payment_pct;
        }
      } catch {}

      const expectedAmount = Number(session.crypto_amount);
      const requiredThreshold = expectedAmount * (minPaymentPct / 100);
      const reqConfs = Number(session.confirmations_required || 1);
      const curConfs = confirmations ?? session.confirmations ?? 0;

      if (received_amount >= requiredThreshold) {
        effectiveStatus = curConfs >= reqConfs ? 'paid' : 'detected';
        console.log(`[pure-wallet Webhook] Overriding webhook partially_paid to ${effectiveStatus} via min_payment_pct (${minPaymentPct}%) tolerance`);
      }
    }

    // 2. Update session status
    const updatePayload: Record<string, unknown> = {
      status: effectiveStatus,
      received_amount,
      tx_hash,
      paid_at: paid_at || (effectiveStatus === 'paid' ? new Date().toISOString() : null),
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
    const validOrderIds = (session.order_ids || []).filter(isUuid);

    if (effectiveStatus === 'paid' && session.status !== 'paid') {
      console.log(`[pure-wallet Webhook] Confirming payment for orders: ${validOrderIds.join(', ')}`);
      
      if (validOrderIds.length > 0) {
        const { error: ordersErr } = await db
          .from('orders')
          .update({
            status: 'paid',
            payment_confirmed_at: new Date().toISOString(),
          })
          .in('id', validOrderIds)
          .neq('status', 'completed');

        if (ordersErr) {
          console.error(`[pure-wallet Webhook] Failed to update orders to paid status:`, ordersErr.message);
        } else {
          // Trigger background provisioning & emails
          fulfillOrders(db, validOrderIds).then((results) => {
            console.log(`[pure-wallet Webhook] Fulfillment completed:`, JSON.stringify(results));
          }).catch((err) => {
            console.error(`[pure-wallet Webhook] Fulfillment error:`, err);
          });
        }
      }
    } else if (status === 'expired' || status === 'cancelled') {
      if (validOrderIds.length > 0) {
        await db
          .from('orders')
          .update({ status: 'expired' })
          .in('id', validOrderIds)
          .in('status', ['pending']);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pure-wallet Webhook Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
