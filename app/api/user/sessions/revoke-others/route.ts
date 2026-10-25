import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    if (!sessionUser || !sessionUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.sessionId) {
      await query(
        `UPDATE public.user_sessions 
         SET revoked_at = NOW() 
         WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL`,
        [sessionUser.id, sessionUser.sessionId]
      );
    } else {
      await query(
        `UPDATE public.user_sessions 
         SET revoked_at = NOW() 
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [sessionUser.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[RevokeOtherSessions Exception]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler beim Abmelden der anderen Sitzungen' }, { status: 500 });
  }
}
