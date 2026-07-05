import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { sendGenericEmail } from '@/lib/email/mailer';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = user.id;
    const email = user.email;

    // Generate secure 32-byte verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

    // Remove any older verification tokens for this user
    await query('DELETE FROM public.verification_tokens WHERE user_id = $1', [userId]);

    // Insert new verification token
    await query(
      'INSERT INTO public.verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // Resolve site base URL from request headers or env
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const verificationLink = `${siteUrl}/api/auth/verify?token=${token}`;

    // Send email using custom SMTP mailer
    await sendGenericEmail({
      to: email,
      subject: '🔑 Bestätige dein PureSim E-Mail-Konto',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px border #e2e8f0; border-radius: 16px;">
          <h2 style="color: #1d4ed8; font-size: 20px;">Hallo,</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            vielen Dank für dein Vertrauen in <strong>PureSim</strong>. Bitte bestätige deine E-Mail-Adresse, um alle Funktionen deines Kontos uneingeschränkt freizuschalten.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${verificationLink}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block;">
              E-Mail-Adresse bestätigen
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
            Dieser Link ist für die nächsten 24 Stunden gültig. Falls der Button oben nicht funktioniert, kopiere diesen Link in deinen Browser:<br />
            <a href="${verificationLink}" style="color: #0ea5e9;">${verificationLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="font-size: 11px; color: #94a3b8;">
            Dies ist eine automatische Benachrichtigung. Bitte antworte nicht direkt auf diese E-Mail.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Resend Verification Error]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler beim Senden' }, { status: 500 });
  }
}
