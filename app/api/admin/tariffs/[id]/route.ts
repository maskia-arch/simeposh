/**
 * PATCH /api/admin/tariffs/[id]
 * Toggle is_active on a tariff or update fields.
 */
import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const db = createServiceClient();
  const { data, error } = await db
    .from('tariffs')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(body as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tariff: data });
}
