import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    if (!sessionUser || !sessionUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'SessionId required' }, { status: 400 });
    }

    // Revoke session belonging strictly to current user
    const res = await query(
      `UPDATE public.user_sessions 
       SET revoked_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING id`,
      [sessionId, sessionUser.id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Sitzung nicht gefunden oder bereits abgemeldet.' }, { status: 404 });
    }

    // If user revoked their own current session, delete cookie
    if (sessionUser.sessionId === sessionId) {
      cookieStore.delete('session_token');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[RevokeSession Exception]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler beim Abmelden der Sitzung' }, { status: 500 });
  }
}
