import crypto from 'crypto';
import { query } from '@/lib/db';
import { sendGenericEmail } from '@/lib/email/mailer';
import { getPublicBaseUrl } from '@/lib/url';

export async function sendVerificationEmailForUser(
  userId: string,
  email: string,
  req?: Request,
  locale: string = 'de'
) {
  // Generate secure 32-byte verification token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

  // Delete older verification tokens for this user
  await query('DELETE FROM public.verification_tokens WHERE user_id = $1', [userId]);

  // Insert new verification token
  await query(
    'INSERT INTO public.verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  const siteUrl = getPublicBaseUrl(req);
  const verificationLink = `${siteUrl}/api/auth/verify?token=${token}`;


  const isEn = locale ? locale.startsWith('en') : false;

  await sendGenericEmail({
    to: email,
    subject: isEn ? '🔑 Confirm your PureSim Email Account' : '🔑 Bestätige dein PureSim E-Mail-Konto',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #1d4ed8; font-size: 20px; margin-top: 0;">${isEn ? 'Hello,' : 'Hallo,'}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          ${
            isEn
              ? 'Thank you for registering at <strong>PureSim</strong>. Please confirm your email address to activate your account and access your eSIMs.'
              : 'vielen Dank für deine Registrierung bei <strong>PureSim</strong>. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren und deine eSIMs zu verwalten.'
          }
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationLink}" style="background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; font-weight: bold; border-radius: 10px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(29,78,216,0.3);">
            ${isEn ? 'Confirm Email Address' : 'E-Mail-Adresse bestätigen'}
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
          ${
            isEn
              ? 'This link is valid for the next 24 hours. If the button above does not work, copy and paste this link into your browser:'
              : 'Dieser Link ist für die nächsten 24 Stunden gültig. Falls der Button oben nicht funktioniert, kopiere diesen Link in deinen Browser:'
          }<br />
          <a href="${verificationLink}" style="color: #0ea5e9; word-break: break-all;">${verificationLink}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">
          ${
            isEn
              ? 'This is an automated notification. Please do not reply directly to this email.'
              : 'Dies ist eine automatische Benachrichtigung. Bitte antworte nicht direkt auf diese E-Mail.'
          }
        </p>
      </div>
    `,
  });

  return { token, verificationLink };
}
