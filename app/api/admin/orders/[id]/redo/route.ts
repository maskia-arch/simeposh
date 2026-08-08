import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrder } from '@/lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const webhookSecret = process.env.SHOP_WEBHOOK_SECRET;
    const cronSecret = process.env.CRON_SECRET;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    const validTokens = [webhookSecret, cronSecret, serviceKey].filter(Boolean) as string[];

    if (validTokens.length === 0) {
      return NextResponse.json({ error: 'No authorization secrets configured' }, { status: 500 });
    }

    if (!token || !validTokens.includes(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const isLatePayment = body?.isLatePayment ?? true;
    const forceResendEmail = body?.forceResendEmail ?? true;

    const db = createServiceClient();
    const result = await fulfillOrder(db, params.id, { forceResendEmail, isLatePayment });
    return NextResponse.json(result);

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
