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
  // Aggressive SEO/LLM crawlers that scrape content
  /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i, /petalbot/i, /bytespider/i, /coccocbot/i, /megaindex/i, /blexbot/i, /serpstatbot/i, /ltx71/i, /zoominfobot/i, /amazonbot/i
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

  // Public metadata endpoints (robots.txt, sitemap.xml) should never trigger bot warning logs
  const isPublicMeta = pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/favicon.ico' || pathname === '/apple-icon.png';

  // Bypass all bot checks for trusted machine-to-machine integrations (e.g. the wallet) and public metadata
  const authHeader = request.headers.get('authorization');
  const webhookSecret = process.env.SHOP_WEBHOOK_SECRET;
  const isTrustedM2M = (webhookSecret && authHeader === `Bearer ${webhookSecret}`) || request.headers.has('x-pure-wallet-signature');

  if (!isTrustedM2M && !isPublicMeta) {
    // 1. Block suspicious path probes (e.g. php admin portals, env files)
    const isSuspiciousPath = SUSPICIOUS_PATH_PATTERNS.some(p => p.test(pathname));
    if (isSuspiciousPath) {
      console.warn(`[Bot Blocked] Suspicious path access: "${pathname}" | UA: "${userAgent}"`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Standard user shop and checkout routes (never block human shoppers for User-Agent quirks or privacy browsers)
    const isStandardUserRoute =
      pathname === '/' ||
      /^\/(cart|checkout|order|tariffs|blog|reviews|dashboard|agb|datenschutz|refund-policy|login|register|topup|success)/i.test(pathname) ||
      pathname.startsWith('/api/crypto') ||
      pathname.startsWith('/api/order') ||
      pathname.startsWith('/api/tariffs');

    if (!isStandardUserRoute) {
      // 2. Block requests with empty/missing User-Agent on non-user routes
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
    }
  }

  const cleanHost = host.toLowerCase().split(':')[0];

  // ── 301 Permanent Redirect www.puresim.com (or www.*) to root domain ──
  if (cleanHost.startsWith('www.')) {
    const canonicalHost = cleanHost.replace(/^www\./, '');
    const redirectUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${canonicalHost}`);
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Dynamic subdomain handler for esim.puresim.net / esim.puresim.com
  if (cleanHost.startsWith('esim.')) {
    const mainDomain = cleanHost.replace(/^esim\./, '') || 'puresim.net';

    // Allow static assets, next internal files, and API endpoints
    const isStaticOrApi =
      pathname.includes('.') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next');

    if (!isStaticOrApi) {
      // 1. If path is already /esim-overview/..., allow pass-through
      if (pathname.startsWith('/esim-overview')) {
        // Proceed normally
      }
      // 2. If path is root '/' or webshop route, REDIRECT to main domain (puresim.net)
      else if (
        pathname === '/' ||
        /^\/(tariffs|cart|checkout|dashboard|login|register|reviews|blog|agb|datenschutz|refund-policy|order|topup)/i.test(pathname)
      ) {
        return NextResponse.redirect(new URL(pathname + request.nextUrl.search, `https://${mainDomain}`), 302);
      }
      // 3. If path is an installation URL (e.g. /[token]/[iccid]), REWRITE to /esim-overview/[token]/[iccid]
      else {
        return NextResponse.rewrite(new URL(`/esim-overview${pathname}`, request.url));
      }
    }
  } else {
    // On main domain (puresim.net), redirect any /esim-overview/... path to esim.puresim.net
    if (pathname.startsWith('/esim-overview/')) {
      const esimPath = pathname.replace(/^\/esim-overview/, '');
      const esimHost = cleanHost.startsWith('www.')
        ? `esim.${cleanHost.replace(/^www\./, '')}`
        : `esim.${cleanHost}`;
      return NextResponse.redirect(new URL(esimPath + request.nextUrl.search, `https://${esimHost}`), 302);
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

  // Redirect unauthenticated users away from protected routes
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

  // ── Security Headers ──
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
