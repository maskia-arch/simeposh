import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signJwt } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

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

    // Insert user into local DB
    await query(
      `INSERT INTO public.users (id, email, password_hash, full_name, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [userId, trimmedEmail, passwordHash, fullName || '']
    );

    // Sign the user in by generating a JWT
    const token = await signJwt({
      id: userId,
      email: trimmedEmail,
      fullName: fullName || '',
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const user = {
      id: userId,
      email: trimmedEmail,
      user_metadata: {
        full_name: fullName || '',
      },
    };

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error('[Registration Error]', err);
    return NextResponse.json({ error: 'Interner Serverfehler während der Registrierung' }, { status: 500 });
  }
}
