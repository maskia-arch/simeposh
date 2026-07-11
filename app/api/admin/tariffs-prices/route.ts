import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const secret = process.env.SHOP_WEBHOOK_SECRET || process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createServiceClient();
    const { data: tariffs, error } = await db
      .from('tariffs')
      .select('package_code, sale_price_eur')
      .eq('is_active', true);

    if (error) {
      console.error('[Tariffs Prices API] DB Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tariffs: tariffs ?? [] });
  } catch (err: any) {
    console.error('[Tariffs Prices API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
