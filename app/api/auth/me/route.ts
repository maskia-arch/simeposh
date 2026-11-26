import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { getReconciledUserCashAccount } from '@/lib/esim-cash';

function jsonWithPrivateNoStore(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.set('Vary', 'Cookie');
  return res;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return jsonWithPrivateNoStore({ user: null });
    }

    const decoded = await verifyJwt(token);
    if (!decoded || !decoded.id) {
      cookieStore.delete('session_token');
      return jsonWithPrivateNoStore({ user: null });
    }

    // Verify user in database: must exist, not be deleted, and be verified
    const userRes = await query(
      'SELECT id, email, full_name, is_verified FROM public.users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.id]
    );

    const userRow = userRes.rows[0];
    if (!userRow || !userRow.is_verified) {
      // Invalidate session if user account is not verified or no longer exists
      cookieStore.delete('session_token');
      return jsonWithPrivateNoStore({ user: null });
    }

    // Server-side query for the user's reconciled eSIM Cash account details
    const cashAcc = await getReconciledUserCashAccount(userRow.id, userRow.email, { createIfMissing: false });

    let cashbackRate = 5;
    let cashBalanceEur = 0;
    if (cashAcc) {
      cashBalanceEur = Number(cashAcc.balance_eur) || 0;
      const spend = Number(cashAcc.total_spend_eur) || 0;
      if (spend >= 1000) cashbackRate = 10;
      else if (spend >= 500) cashbackRate = 8;
      else if (spend >= 100) cashbackRate = 6;

      if (Number(cashAcc.extra_cashback_queue) > 0) {
        cashbackRate += 5;
      }
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      is_verified: true,
      cashback_rate: cashbackRate,
      cash_balance_eur: cashBalanceEur,
      user_metadata: {
        full_name: userRow.full_name || '',
      },
    };

    return jsonWithPrivateNoStore({ user });
  } catch (err: any) {
    return jsonWithPrivateNoStore({ user: null, error: err.message }, { status: 500 });
  }
}
