import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { isUuid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : null;
    const setupToken = typeof body.setupToken === 'string' ? body.setupToken.trim() : null;

    if (!orderId && !setupToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const service = createServiceClient();

    // 1. Setup token lookup (used on the dedicated setup page /s/[token])
    if (setupToken) {
      const { data: order } = await service
        .from('orders')
        .select('id, iccid, status')
        .eq('setup_token', setupToken)
        .in('status', ['completed', 'paid', 'provisioning'])
        .maybeSingle();

      if (order && order.iccid) {
        return NextResponse.json(
          { iccid: order.iccid },
          { headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' } }
        );
      }
      return NextResponse.json({ error: 'eSIM not found' }, { status: 404 });
    }

    // 2. Authenticated user session lookup (used in dashboard, order details, topup)
    if (orderId && isUuid(orderId)) {
      const supabase = await createClient();
      let { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/(^|;)\s*session_token\s*=\s*([^;]+)/);
        if (match) {
          const decoded = await verifyJwt(match[2]);
          if (decoded && decoded.id) {
            user = { id: decoded.id } as any;
          }
        }
      }

      if (!user || !user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: order } = await service
        .from('orders')
        .select('id, iccid, user_id, status')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (!order.iccid) {
        return NextResponse.json({ error: 'No ICCID assigned yet' }, { status: 404 });
      }

      return NextResponse.json(
        { iccid: order.iccid },
        { headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' } }
      );
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    console.error('[reveal-iccid] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
