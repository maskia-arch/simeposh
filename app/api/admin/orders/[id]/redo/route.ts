import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrder } from '@/lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const secret = process.env.SHOP_WEBHOOK_SECRET || process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
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
