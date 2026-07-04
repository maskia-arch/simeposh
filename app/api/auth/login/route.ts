import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signJwt } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query database for the user row
    const dbRes = await query('SELECT * FROM public.users WHERE email = $1', [trimmedEmail]);
    const userRow = dbRes.rows[0];

    if (!userRow || !userRow.password_hash) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse oder Passwort' }, { status: 400 });
    }

    // Verify password hash
    const isValid = verifyPassword(password, userRow.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse oder Passwort' }, { status: 400 });
    }

    // Generate JWT token
    const token = await signJwt({
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
    });

    // Set secure HttpOnly session cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const user = {
      id: userRow.id,
      email: userRow.email,
      user_metadata: {
        full_name: userRow.full_name,
      },
    };

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error('[Login Error]', err);
    return NextResponse.json({ error: 'Interner Serverfehler während des Logins' }, { status: 500 });
  }
}
