import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { sendVerificationEmailForUser } from '@/lib/email/verification';

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const checkRes = await query('SELECT 1 FROM public.users WHERE email = $1', [trimmedEmail]);
    if (checkRes.rows.length > 0) {
      return NextResponse.json({ error: 'Ein Benutzer mit dieser E-Mail existiert bereits' }, { status: 400 });
    }

    // Generate UUID and hash password
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    // Insert user into local DB with is_verified = FALSE
    await query(
      `INSERT INTO public.users (id, email, password_hash, full_name, is_verified, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())`,
      [userId, trimmedEmail, passwordHash, fullName || '']
    );

    // Dispatch activation email immediately
    try {
      await sendVerificationEmailForUser(userId, trimmedEmail, request);
    } catch (mailErr) {
      console.error('[Register Email Dispatch Error]', mailErr);
      // In case of mail server glitch, cron will retry unverified accounts
    }

    const user = {
      id: userId,
      email: trimmedEmail,
      user_metadata: {
        full_name: fullName || '',
      },
    };

    return NextResponse.json({ user, requiresVerification: true });
  } catch (err: any) {
    console.error('[Registration Error]', err);
    return NextResponse.json({ error: 'Interner Serverfehler während der Registrierung' }, { status: 500 });
  }
}
