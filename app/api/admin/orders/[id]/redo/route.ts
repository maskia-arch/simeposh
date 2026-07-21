import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrder } from '@/lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createServiceClient();
    const result = await fulfillOrder(db, params.id, { forceResendEmail: true });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
