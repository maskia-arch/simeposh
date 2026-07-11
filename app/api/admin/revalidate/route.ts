import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const secret = process.env.SHOP_WEBHOOK_SECRET || process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Revalidate API] Revalidating storefront paths...');
    revalidatePath('/');
    revalidatePath('/tariffs');
    revalidatePath('/api/destinations');
    
    return NextResponse.json({ ok: true, revalidated: true, now: new Date().toISOString() });
  } catch (err: any) {
    console.error('[Revalidate API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
