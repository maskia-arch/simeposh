/**
 * GET/POST /api/crypto/address-pool
 *
 * GET: Returns { count } of the address pool.
 * POST: Initializes the address pool with 50 static addresses.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AddressPool {
  next_index: number;
  addresses: Array<{
    address: string;
    index: number;
  }>;
}

export async function GET(request: Request) {
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  // Authorization check (M2M GET)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = createServiceClient();
    const { data } = await db
      .from('system_settings')
      .select('value')
      .eq('key', 'crypto_address_pool')
      .maybeSingle();

    if (!data?.value) {
      return NextResponse.json({ count: 0 });
    }

    const pool = JSON.parse(data.value) as AddressPool;
    if (!pool || !Array.isArray(pool.addresses)) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({
      count: pool.addresses.length,
      first_address: pool.addresses[0]?.address || null
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[address-pool GET] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-pure-wallet-signature') || '';

    const secret = process.env.SHOP_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
    }

    // Verify HMAC signature
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (computedSignature !== signatureHeader) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as { addresses?: Array<{ address: string; index: number }> };
    const newAddrs = payload.addresses || [];

    if (newAddrs.length === 0) {
      return NextResponse.json({ error: 'No addresses supplied' }, { status: 400 });
    }

    const db = createServiceClient();
    
    // Initialize pool structure with next_index = 0
    const pool: AddressPool = {
      next_index: 0,
      addresses: newAddrs.map(item => ({
        address: item.address,
        index: item.index
      }))
    };

    // Save back to database
    const { error: saveError } = await db
      .from('system_settings')
      .upsert({
        key: 'crypto_address_pool',
        value: JSON.stringify(pool),
        description: 'Static pool of offline pre-derived cryptocurrency receiving addresses',
      }, { onConflict: 'key' });

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    console.log(`[Address Pool] Initialized static pool with ${pool.addresses.length} addresses.`);
    return NextResponse.json({ success: true, count: pool.addresses.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[address-pool POST] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
