import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { password, confirmationText } = await req.json();

    if (confirmationText !== 'LÖSCHEN') {
      return NextResponse.json({ error: 'Bitte bestätige den Löschvorgang mit dem Wort LÖSCHEN' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Passwort erforderlich zur Verifizierung' }, { status: 400 });
    }

    // Fetch user row to verify password
    const userRes = await query('SELECT password_hash FROM public.users WHERE id = $1', [user.id]);
    const userRow = userRes.rows[0];

    if (!userRow || !userRow.password_hash) {
      return NextResponse.json({ error: 'Benutzerkonto-Daten unvollständig' }, { status: 400 });
    }

    const isValid = verifyPassword(password, userRow.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Passwort ist ungültig' }, { status: 400 });
    }

    // Check if user has orders
    const ordersRes = await query('SELECT id FROM public.orders WHERE user_id = $1 LIMIT 1', [user.id]);
    const hasOrders = ordersRes.rows.length > 0;

    if (hasOrders) {
      // ── GDPR Soft Delete & Anonymization (accounting retention requirement) ──
      const anonymousEmail = `deleted_user_${user.id.slice(0, 8)}@puresim.net`;

      // 1. Anonymize profile in users table
      await query(
        `UPDATE public.users 
         SET email = $1, 
             password_hash = NULL, 
             full_name = 'Gelöschter Benutzer', 
             phone = NULL, 
             billing_address = NULL, 
             is_verified = FALSE, 
             two_factor_enabled = FALSE, 
             deleted_at = NOW(), 
             updated_at = NOW() 
         WHERE id = $2`,
        [anonymousEmail, user.id]
      );

      // 2. Anonymize orders customer fields
      await query(
        `UPDATE public.orders 
         SET customer_email = $1, 
             customer_name = 'Gelöschter Benutzer', 
             updated_at = NOW() 
         WHERE user_id = $2`,
        [anonymousEmail, user.id]
      );

      // 3. Clear/anonymize eSIM Cash account
      await query(
        `UPDATE public.esim_cash_accounts 
         SET balance_eur = 0.00, 
             email = $1, 
             updated_at = NOW() 
         WHERE user_id = $2`,
        [anonymousEmail, user.id]
      );

    } else {
      // ── Hard Delete (no transactions exist) ──
      await query('DELETE FROM public.users WHERE id = $1', [user.id]);
    }

    // Clear session cookies
    const cookieStore = await cookies();
    cookieStore.delete('session_token');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Delete Account Error]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}
