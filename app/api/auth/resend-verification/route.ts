import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { sendVerificationEmailForUser } from '@/lib/email/verification';

export async function POST(req: Request) {
  try {
    let email: string | undefined;

    const body = await req.json().catch(() => ({}));
    if (body?.email && typeof body.email === 'string') {
      email = body.email.trim().toLowerCase();
    }

    // If no email in body, try to get from logged-in session
    if (!email) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        email = user.email.toLowerCase();
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse ist erforderlich.' }, { status: 400 });
    }

    // Look up user in database
    const userRes = await query(
      'SELECT id, email, is_verified, locale FROM public.users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    const userRow = userRes.rows[0];

    if (!userRow) {
      // Return success to prevent email enumeration attacks
      return NextResponse.json({ success: true });
    }

    if (userRow.is_verified) {
      return NextResponse.json({ success: true, message: 'Deine E-Mail-Adresse ist bereits verifiziert.' });
    }

    const userId: string = userRow.id;
    const locale: string = userRow.locale || 'de';

    // Rate-limiting / Cooldown check (max 1 email per 60 seconds)
    const recentTokenRes = await query(
      'SELECT created_at FROM public.verification_tokens WHERE user_id = $1 AND created_at > NOW() - INTERVAL \'60 seconds\'',
      [userId]
    );

    if (recentTokenRes.rows.length > 0) {
      return NextResponse.json(
        { error: 'Bitte warte 60 Sekunden, bevor du eine erneute Aktivierungs-E-Mail anforderst.' },
        { status: 429 }
      );
    }

    // Send verification email using unified helper
    await sendVerificationEmailForUser(userId, userRow.email, req, locale);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Resend Verification Error]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler beim Senden' }, { status: 500 });
  }
}
