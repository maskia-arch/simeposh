import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const decoded = await verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ user: null });
    }

    // Server-side query for the user's eSIM cashback account details
    const cashRes = await query(
      'SELECT total_spend_eur, extra_cashback_queue FROM public.esim_cash_accounts WHERE user_id = $1',
      [decoded.id]
    );

    let cashbackRate = 5;
    if (cashRes.rows.length > 0) {
      const row = cashRes.rows[0];
      const spend = Number(row.total_spend_eur) || 0;
      if (spend >= 1000) cashbackRate = 10;
      else if (spend >= 500) cashbackRate = 8;
      else if (spend >= 100) cashbackRate = 6;

      if (Number(row.extra_cashback_queue) > 0) {
        cashbackRate += 5;
      }
    }

    const user = {
      id: decoded.id,
      email: decoded.email,
      cashback_rate: cashbackRate,
      user_metadata: {
        full_name: decoded.fullName,
      },
    };

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}
