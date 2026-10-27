import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { parseUserAgent, maskIp } from '@/lib/auth/sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const locale = request.headers.get('x-locale') || 'de';
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    if (!sessionUser || !sessionUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await query(
      `SELECT id, user_agent, ip_address, created_at, last_active_at
       FROM public.user_sessions
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY last_active_at DESC
       LIMIT 25`,
      [sessionUser.id]
    );

    const currentSessionId = sessionUser.sessionId || null;

    const sessions = res.rows.map((row: any) => {
      const uaInfo = parseUserAgent(row.user_agent, locale);
      return {
        id: row.id,
        isCurrent: Boolean(currentSessionId && row.id === currentSessionId),
        deviceDescription: uaInfo.description,
        deviceType: uaInfo.device,
        browser: uaInfo.browser,
        os: uaInfo.os,
        ipMasked: maskIp(row.ip_address),
        createdAt: row.created_at,
        lastActiveAt: row.last_active_at,
      };
    });

    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error('[UserSessions Exception]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler beim Laden der Sitzungen' }, { status: 500 });
  }
}
