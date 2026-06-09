/**
 * Server-side admin authorisation helper.
 *
 * Admin status is determined purely by matching the logged-in user's e-mail
 * against the ADMIN_EMAIL environment variable – no DB changes required.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Call at the top of every admin Server Component.
 * Returns the authenticated user or redirects away.
 */
export async function requireAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL is not set in environment variables.');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  if (user.email !== adminEmail) {
    // Authenticated but not admin → send to user dashboard
    redirect('/dashboard');
  }

  return user;
}

/**
 * Verify admin access inside an API Route Handler.
 * Returns { ok: true, user } or { ok: false, response: NextResponse }.
 */
export async function verifyAdminApi() {
  const { NextResponse } = await import('next/server');
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 }),
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== adminEmail) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Not Found' }, { status: 404 }),
    };
  }

  return { ok: true as const, user };
}
