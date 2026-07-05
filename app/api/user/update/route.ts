import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { sendGenericEmail } from '@/lib/email/mailer';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { name, phone, billing_address, email } = await req.json();

    // 1. Update personal details in public.users table
    await query(
      `UPDATE public.users 
       SET full_name = $1, 
           phone = $2, 
           billing_address = $3, 
           updated_at = NOW() 
       WHERE id = $4`,
      [name || null, phone || null, billing_address || null, user.id]
    );

    // 2. Handle email update if it differs from current auth email
    if (email && email.trim().toLowerCase() !== user.email?.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();

      // Check if email already exists for another user
      const checkRes = await query('SELECT 1 FROM public.users WHERE email = $1 AND id != $2', [cleanEmail, user.id]);
      if (checkRes.rows.length > 0) {
        return NextResponse.json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' }, { status: 400 });
      }

      // Generate verification token for the email change
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Remove any existing tokens for this user
      await query('DELETE FROM public.verification_tokens WHERE user_id = $1', [user.id]);

      // Save token with the new email
      await query(
        'INSERT INTO public.verification_tokens (user_id, token, new_email, expires_at) VALUES ($1, $2, $3, $4)',
        [user.id, token, cleanEmail, expiresAt]
      );

      // Resolve site base URL checking reverse proxy headers (e.g. Traefik/Nginx in Docker)
      const forwardedHost = req.headers.get('x-forwarded-host');
      const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
      let host = forwardedHost || req.headers.get('host') || 'puresim.net';
      
      // Fallback if resolving to internal Docker container addresses
      if (host.includes('0.0.0.0') || host.includes('127.0.0.1') || (host.includes('localhost') && process.env.NODE_ENV === 'production')) {
        host = 'puresim.net';
      }

      const protocol = forwardedHost ? forwardedProto : (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
      const verificationLink = `${siteUrl}/api/auth/verify?token=${token}`;

      // Send verification link to the NEW email address
      await sendGenericEmail({
        to: cleanEmail,
        subject: '🔑 Bestätige deine neue E-Mail-Adresse für PureSim',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2 style="color: #1d4ed8; font-size: 20px;">Hallo,</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              du hast beantragt, die E-Mail-Adresse deines PureSim-Kontos zu ändern. Bitte bestätige die neue E-Mail-Adresse, um die Änderung abzuschließen.
            </p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${verificationLink}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block;">
                Neue E-Mail-Adresse verifizieren
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
              Dieser Link ist für die nächsten 24 Stunden gültig. Falls der Button oben nicht funktioniert, kopiere diesen Link in deinen Browser:<br />
              <a href="${verificationLink}" style="color: #0ea5e9;">${verificationLink}</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
            <p style="font-size: 11px; color: #94a3b8;">
              Wenn du diese Änderung nicht beauftragt hast, kannst du diese E-Mail ignorieren. Es werden keine Änderungen an deinem Konto vorgenommen.
            </p>
          </div>
        `,
      });

      return NextResponse.json({ success: true, emailChangePending: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Profile Update Error]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler beim Speichern' }, { status: 500 });
  }
}
