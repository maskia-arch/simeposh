import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email');

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    let targetEmail = sessionUser?.email ? sessionUser.email.trim().toLowerCase() : null;
    if (!targetEmail && queryEmail) {
      targetEmail = queryEmail.trim().toLowerCase();
    }

    if (!targetEmail) {
      return NextResponse.json({ tickets: [] });
    }

    const db = createServiceClient();
    const { data: tickets, error } = await db
      .from('support_tickets')
      .select('*')
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
