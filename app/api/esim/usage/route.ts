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

    // Security & Anti-tampering Check: Verify that the ICCID exists in our database
    const db = createServiceClient();
    const { data: orders } = await db
      .from('orders')
      .select('id, status, period_num, tariffs(data_gb)')
      .eq('iccid', iccid)
      .in('status', ['completed', 'paid', 'provisioning']);

    const order = orders && orders.length > 0 ? (orders[0] as any) : null;

    if (!order) {
      return NextResponse.json({ error: 'eSIM nicht gefunden oder ungültig' }, { status: 404 });
    }

    console.log('[esim/usage] Querying status for ICCID:', iccid);
    const statusRes = await getEsimStatus(iccid);

    let dataTotal = statusRes.obj.dataTotal;
    let dataRemaining = statusRes.obj.dataRemaining;

    // Resilient Fallback: If esimaccess API returns 0 dataTotal for a brand-new / unused eSIM,
    // fallback to tariff data_gb from DB so total and remaining data are correctly displayed to the user.
    const dbDataGb = order.period_num ? null : (order.tariffs?.data_gb ?? null);
    if (dataTotal === 0 && dbDataGb && dbDataGb > 0) {
      dataTotal = dbDataGb * 1_073_741_824;
      dataRemaining = dataTotal; // Brand new unused eSIM has 100% remaining
    }

    return NextResponse.json({
      status: statusRes.obj.status || 'NOT_ACTIVATED',
      dataRemaining,
      dataTotal,
      expiredTime: statusRes.obj.expiredTime,
    });
  } catch (err: any) {
    console.error('[esim/usage] Error occurred:', err.message);
    return NextResponse.json({ error: 'Abfrage derzeit nicht möglich' }, { status: 500 });
  }
}
