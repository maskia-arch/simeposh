import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { enabled, password } = await req.json();

    if (password === undefined || password === '') {
      return NextResponse.json({ error: 'Passwort erforderlich zur Verifizierung' }, { status: 400 });
    }

    // Fetch user profile from DB to get the password_hash
    const dbRes = await query('SELECT password_hash FROM public.users WHERE id = $1', [user.id]);
    const userRow = dbRes.rows[0];

    if (!userRow || !userRow.password_hash) {
      return NextResponse.json({ error: 'Benutzerkonto-Daten unvollständig' }, { status: 400 });
    }

    // Verify current password hash
    const isValid = verifyPassword(password, userRow.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Passwort ist ungültig' }, { status: 400 });
    }

    // Update two_factor_enabled column in public.users
    await query(
      'UPDATE public.users SET two_factor_enabled = $1, updated_at = NOW() WHERE id = $2',
      [!!enabled, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[2FA Update Error]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}
