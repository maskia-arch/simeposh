import { NextResponse } from 'next/server';
import { getEsimStatus } from '@/lib/esimaccess/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const iccid = searchParams.get('iccid')?.trim();

    if (!iccid) {
      return NextResponse.json({ error: 'ICCID required' }, { status: 400 });
    }

    console.log('[esim/usage] Querying status for ICCID:', iccid);
    const statusRes = await getEsimStatus(iccid);

    if (!statusRes.success) {
      console.error('[esim/usage] eSIMAccess returned error:', statusRes.errorCode);
      return NextResponse.json({ error: `eSIMAccess error code ${statusRes.errorCode}` }, { status: 500 });
    }

    return NextResponse.json({
      status: statusRes.obj.status,
      dataRemaining: statusRes.obj.dataRemaining,
      dataTotal: statusRes.obj.dataTotal,
      expiredTime: statusRes.obj.expiredTime,
    });
  } catch (err: any) {
    console.error('[esim/usage] Error occurred:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
