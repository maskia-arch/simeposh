import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tariffId = searchParams.get('tariffId');
    const packageCode = searchParams.get('packageCode');

    if (!tariffId && !packageCode) {
      return NextResponse.json({ error: 'tariffId or packageCode required' }, { status: 400 });
    }

    const db = createServiceClient();
    let query = db.from('tariff_price_history').select('price_eur, recorded_at');

    if (tariffId) {
      query = query.eq('tariff_id', tariffId);
    } else if (packageCode) {
      query = query.eq('package_code', packageCode);
    }

    // Sort by recorded_at ascending so chart is drawn from oldest to newest
    const { data, error } = await query.order('recorded_at', { ascending: true });

    if (error) {
      console.error('[Price History API] DB Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data ?? [] });
  } catch (err: any) {
    console.error('[Price History API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
