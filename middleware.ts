import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { detectLocale, countryFromHeaders } from '@/lib/i18n/detect';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/admin'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── Affiliate Referral Link cookie tracker ──
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode) {
    supabaseResponse.cookies.set('referred_by', refCode.trim(), {
      path:     '/',
      maxAge:   60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // Refresh session – required for Server Components to read auth state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Auto-detect & persist the visitor's language on first visit ──
  // Respects a manual choice (LanguageSwitcher writes the same cookie).
  if (!request.cookies.get('locale')) {
    const geo = (request as { geo?: { country?: string } }).geo?.country
      ?? countryFromHeaders((n) => request.headers.get(n));
    const locale = detectLocale({
      country:        geo,
      acceptLanguage: request.headers.get('accept-language'),
    });
    // Make it visible to THIS request's SSR render (no first-paint flash)…
    request.cookies.set('locale', locale);
    // …and persist it in the browser for subsequent visits.
    supabaseResponse.cookies.set('locale', locale, {
      path:     '/',
      maxAge:   60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  const pathname = request.nextUrl.pathname;

  // 1. Strict protection for /admin routes (pages only)
  if (pathname.startsWith('/admin')) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!user || user.email !== adminEmail) {
      const dest = user ? '/dashboard' : '/';
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // 2. Redirect unauthenticated users away from remaining protected routes
  const isProtected = PROTECTED_ROUTES.filter((r) => r !== '/admin').some((route) =>
    pathname.startsWith(route)
  );
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const dest = (adminEmail && user.email === adminEmail) ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
