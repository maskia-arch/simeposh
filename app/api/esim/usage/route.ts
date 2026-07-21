import { NextResponse } from 'next/server';
import { getEsimStatus } from '@/lib/esimaccess/client';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const iccid = searchParams.get('iccid')?.trim();

    if (!iccid) {
      return NextResponse.json({ error: 'ICCID erforderlich' }, { status: 400 });
    }

    // Security & Anti-tampering Check: Verify that the ICCID exists for a completed order
    const db = createServiceClient();
    const { data: order } = await db
      .from('orders')
      .select('id, status')
      .eq('iccid', iccid)
      .eq('status', 'completed')
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'eSIM nicht gefunden oder ungültig' }, { status: 404 });
    }

    console.log('[esim/usage] Querying status for ICCID:', iccid);
    const statusRes = await getEsimStatus(iccid);

    if (!statusRes.success) {
      console.error('[esim/usage] Provider returned error code:', statusRes.errorCode);
      return NextResponse.json({ error: 'Statusabfrage derzeit nicht verfügbar' }, { status: 500 });
    }

    return NextResponse.json({
      status: statusRes.obj.status,
      dataRemaining: statusRes.obj.dataRemaining,
      dataTotal: statusRes.obj.dataTotal,
      expiredTime: statusRes.obj.expiredTime,
    });
  } catch (err: any) {
    console.error('[esim/usage] Error occurred:', err.message);
    return NextResponse.json({ error: 'Abfrage derzeit nicht möglich' }, { status: 500 });
  }
}
