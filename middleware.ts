import { NextResponse, type NextRequest } from 'next/server';
import { detectLocale, countryFromHeaders } from '@/lib/i18n/detect';
import { verifyJwt } from '@/lib/auth/jwt';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // ── Affiliate Referral Link cookie tracker ──
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode) {
    response.cookies.set('referred_by', refCode.trim(), {
      path:     '/',
      maxAge:   60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });
  }

  // ── Local Authentication Check (session JWT) ──
  const token = request.cookies.get('session_token')?.value;
  const user = token ? await verifyJwt(token) : null;

  // ── Auto-detect & persist the visitor's language on first visit ──
  if (!request.cookies.get('locale')) {
    const geo = (request as { geo?: { country?: string } }).geo?.country
      ?? countryFromHeaders((n) => request.headers.get(n));
    const locale = detectLocale({
      country:        geo,
      acceptLanguage: request.headers.get('accept-language'),
    });
    // Make it visible to THIS request's SSR render...
    request.cookies.set('locale', locale);
    // ...and persist it in the browser for subsequent visits.
    response.cookies.set('locale', locale, {
      path:     '/',
      maxAge:   60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  const pathname = request.nextUrl.pathname;

  // 2. Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
