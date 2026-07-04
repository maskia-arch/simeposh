import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ user: null });
    }

    const user = {
      id: decoded.id,
      email: decoded.email,
      user_metadata: {
        full_name: decoded.fullName,
      },
    };

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}
