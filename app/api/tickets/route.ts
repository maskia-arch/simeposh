import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    if (!sessionUser || !sessionUser.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetEmail = sessionUser.email.trim().toLowerCase();

    const db = createServiceClient();
    const { data: tickets, error } = await db
      .from('support_tickets')
      .select('id, ticket_number, customer_email, customer_name, subject, category, status, priority, invoice_id, iccid, created_at, updated_at')
      .eq('customer_email', targetEmail)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Tickets GET API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tickets: tickets ?? [] });
  } catch (err: any) {
    console.error('[Tickets GET API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}
