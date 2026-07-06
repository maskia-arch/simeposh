import { NextResponse, type NextRequest } from 'next/server';
import { detectLocale, countryFromHeaders } from '@/lib/i18n/detect';
import { verifyJwt } from '@/lib/auth/jwt';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];

// ── Bot Protection Configuration ──
const WHITELIST_BOT_PATTERNS = [
  /googlebot/i,
  /google-shopping-updater/i,
  /bingbot/i,
  /bingpreview/i,
  /duckduckbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /slurp/i,
  /sogou/i,
];

const BLACKLIST_BOT_PATTERNS = [
  // Hacking / Vulnerability scanners
  /sqlmap/i, /nmap/i, /nikto/i, /acunetix/i, /dirbuster/i, /nessus/i, /openvas/i, /w3af/i, /netsparker/i, /censys/i, /shodan/i, /masscan/i, /zgrab/i,
  // Python / scraping libraries
  /python-requests/i, /pycurl/i, /urllib/i, /scrapy/i, /beautifulsoup/i,
  // Node.js / JS scraping
  /headlesschrome/i, /selenium/i, /puppeteer/i, /playwright/i, /phantomjs/i, /jsdom/i, /node-fetch/i, /axios/i, /got/i, /superagent/i,
  // Other language clients
  /guzzle/i, /go-http-client/i, /okhttp/i, /rest-client/i, /faraday/i, /mechanize/i, /libwww/i, /httpclient/i, /http-client/i,
  // Command line downloaders
  /curl/i, /wget/i,
  // Aggressive / SEO crawlers that scrape but don't show search results (saving resources)
  /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i, /petalbot/i, /bytespider/i, /coccocbot/i, /megaindex/i, /blexbot/i, /serpstatbot/i, /ltx71/i, /zoominfobot/i, /amazonbot/i, /claudebot/i, /gptbot/i, /chatgpt-user/i
];

const SUSPICIOUS_PATH_PATTERNS = [
  /\.php$/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/xmlrpc/i,
  /\.env/i,
  /\.git/i,
  /\/cgi-bin/i,
  /\/etc\/passwd/i,
  /\.well-known\/.*(env|yaml|yml)/i,
];

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Block suspicious path probes (e.g. php admin portals, env files)
  const isSuspiciousPath = SUSPICIOUS_PATH_PATTERNS.some(p => p.test(pathname));
  if (isSuspiciousPath) {
    console.warn(`[Bot Blocked] Suspicious path access: "${pathname}" | UA: "${userAgent}"`);
    return new NextResponse('Forbidden', { status: 403 });
  }

  // 2. Block requests with empty/missing User-Agent
  if (!userAgent.trim()) {
    console.warn(`[Bot Blocked] Empty User-Agent accessing: "${pathname}"`);
    return new NextResponse('Forbidden', { status: 403 });
  }

  // 3. User-Agent checking (whitelist search engines, blacklist known bad/scraper bots)
  const isWhitelistedBot = WHITELIST_BOT_PATTERNS.some(p => p.test(userAgent));
  if (!isWhitelistedBot) {
    const isBlacklistedBot = BLACKLIST_BOT_PATTERNS.some(p => p.test(userAgent));
    if (isBlacklistedBot) {
      console.warn(`[Bot Blocked] Bad bot/scraper UA: "${userAgent}" | Path: "${pathname}"`);
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Dynamic subdomain rewrite for esim.puresim.net
  if (host.includes('esim.puresim.net')) {
    // Avoid rewriting static assets or API calls
    if (pathname !== '/' && !pathname.includes('.') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
      return NextResponse.rewrite(new URL(`/esim-overview${pathname}`, request.url));
    }
  }

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
