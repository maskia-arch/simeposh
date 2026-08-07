import { NextResponse } from 'next/server';
import { getEsimStatus } from '@/lib/esimaccess/client';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceClient();
  
  try {
    // Select all completed/paid/provisioning eSIM orders
    const { data: orders, error } = await db
      .from('orders')
      .select('id, iccid, smdp_status, period_num, tariffs(data_gb)')
      .in('status', ['completed', 'paid', 'provisioning']);

    if (error || !orders) {
      console.error('[cron/sync-esim-usage] DB fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Exclude eSIMs without ICCID or where smdp_status is 'DELETED'
    const activeOrders = orders.filter((o: any) => {
      if (!o.iccid) return false;
      const smdp = (o.smdp_status || '').toUpperCase();
      return smdp !== 'DELETED';
    });

    console.log(`[cron/sync-esim-usage] Syncing ${activeOrders.length} active eSIMs (excluded ${orders.length - activeOrders.length} deleted/invalid)...`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const order of activeOrders as any[]) {
      const iccid = order.iccid;
      if (!iccid) continue;

      try {
        const statusRes = await getEsimStatus(iccid);
        if (statusRes.success && statusRes.obj) {
          let dataTotal = statusRes.obj.dataTotal;
          let dataRemaining = statusRes.obj.dataRemaining;

          const dbDataGb = order.period_num ? null : (order.tariffs?.data_gb ?? null);
          if (dataTotal === 0 && dbDataGb && dbDataGb > 0) {
            dataTotal = dbDataGb * 1_073_741_824;
            dataRemaining = dataTotal;
          }

          const nowIso = new Date().toISOString();
          const esimStatusVal = statusRes.obj.status || statusRes.obj.esimStatus || 'NOT_ACTIVATED';
          const smdpStatusVal = statusRes.obj.smdpStatus || null;
          const expiredAtVal = statusRes.obj.expiredTime ? new Date(statusRes.obj.expiredTime).toISOString() : null;

          await db
            .from('orders')
            .update({
              esim_status: esimStatusVal,
              smdp_status: smdpStatusVal,
              data_remaining_bytes: dataRemaining,
              data_total_bytes: dataTotal,
              esim_expired_at: expiredAtVal,
              esim_usage_updated_at: nowIso,
            } as any)
            .eq('id', order.id);

          updatedCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        console.error(`[cron/sync-esim-usage] Error syncing ICCID ${iccid}:`, err.message);
        failedCount++;
      }

      // Small delay between requests to avoid rate limits
      await new Promise((res) => setTimeout(res, 200));
    }

    return NextResponse.json({
      ok: true,
      totalActive: activeOrders.length,
      updated: updatedCount,
      failed: failedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[cron/sync-esim-usage] Exception:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
