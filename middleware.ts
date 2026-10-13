import { NextResponse, type NextRequest } from 'next/server';
import { detectLocale, countryFromHeaders } from '@/lib/i18n/detect';
import { isValidLocale } from '@/lib/i18n/config';
import { verifyJwt } from '@/lib/auth/jwt';
import { resolveCountryOrRegionCode, countryCodeToSlug } from '@/lib/destinations-shared';
import { render404Html, UNLIMITED_ENABLED_CODES } from '@/lib/not-found-html';

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

  // Public metadata endpoints (robots.txt, sitemap.xml, llms.txt, etc.) should never trigger bot warning logs
  const isPublicMeta =
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sitemap/') ||
    pathname === '/llms.txt' ||
    pathname === '/favicon.ico' ||
    pathname === '/apple-icon.png' ||
    pathname === '/icon.png';

  // Bypass all bot checks for trusted machine-to-machine integrations (e.g. the wallet) and public metadata
  const authHeader = request.headers.get('authorization');
  const webhookSecret = process.env.SHOP_WEBHOOK_SECRET;
  const isTrustedM2M = (webhookSecret && authHeader === `Bearer ${webhookSecret}`) || request.headers.has('x-pure-wallet-signature');

  // Detect language prefix: English (/en) or other 13 supported languages (/fr, /es, /it, /nl, /pl, /pt, /tr, /sv, /da, /fi, /cs, /ro, /hu)
  const langMatch = pathname.match(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?=\/|$)/);
  const detectedLocale = langMatch ? langMatch[1] : 'de';
  const isPrefixed = Boolean(langMatch);
  const normalizedPath = isPrefixed ? (pathname.replace(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)/, '') || '/') : pathname;
  const langPrefix = isPrefixed ? `/${detectedLocale}` : '';

  const isStandardUserRoute =
    normalizedPath === '/' ||
    /^\/(ai|cart|checkout|order|tariffs|esim|unlimited|configurator|blog|reviews|dashboard|agb|datenschutz|refund-policy|login|register|topup|success)(\/|$)/i.test(normalizedPath) ||
    /^\/[a-zA-Z0-9_-]+\/[0-9]+$/.test(normalizedPath) ||
    pathname.startsWith('/api/');

  if (!isTrustedM2M && !isPublicMeta) {
    // 1. Block suspicious path probes (e.g. php admin portals, env files)
    const isSuspiciousPath = SUSPICIOUS_PATH_PATTERNS.some(p => p.test(pathname));
    if (isSuspiciousPath) {
      console.warn(`[Bot Blocked] Suspicious path access: "${pathname}" | UA: "${userAgent}"`);
      return new NextResponse('Forbidden', { status: 403 });
    }

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

  // ── 308 Permanent Redirect /de or /de/* to root / or /* ──
  if (pathname === '/de') {
    return NextResponse.redirect(new URL('/' + request.nextUrl.search, request.url), 308);
  }
  if (pathname.startsWith('/de/')) {
    const deTarget = pathname.replace(/^\/de/, '') || '/';
    return NextResponse.redirect(new URL(deTarget + request.nextUrl.search, request.url), 308);
  }


  // ── 301 Redirect old filter URLs: /tariffs?q=Germany -> /esim/germany ──
  if (normalizedPath === '/tariffs') {
    const q = request.nextUrl.searchParams.get('q');
    if (q) {
      const code = resolveCountryOrRegionCode(q);
      if (code) {
        const targetSlug = countryCodeToSlug(code, q);
        return NextResponse.redirect(new URL(`${langPrefix}/esim/${targetSlug}`, request.url), 301);
      }
    }
  }

  // ── 301 Redirect old soft-404 country URLs: /tariffs/germany -> /esim/germany ──
  if (normalizedPath.startsWith('/tariffs/')) {
    const slug = normalizedPath.replace(/^\/tariffs\//, '').trim();
    if (slug) {
      const code = resolveCountryOrRegionCode(slug);
      if (code) {
        const targetSlug = countryCodeToSlug(code, slug);
        return NextResponse.redirect(new URL(`${langPrefix}/esim/${targetSlug}`, request.url), 301);
      }
    }
  }

  // ── 301 Redirect old soft-404 /esim/unlimited -> /unlimited/germany ──
  if (normalizedPath === '/esim/unlimited') {
    return NextResponse.redirect(new URL(`${langPrefix}/unlimited/germany`, request.url), 301);
  }

  // ── 301 Redirect bare /unlimited or /configurator without country -> /unlimited/germany ──
  if (normalizedPath === '/unlimited' || normalizedPath === '/configurator') {
    return NextResponse.redirect(new URL(`${langPrefix}/unlimited/germany`, request.url), 301);
  }

  // ── 301 Redirect mismatched blog slugs between German (/blog/...) and English (/en/blog/...) ──
  if (normalizedPath.startsWith('/blog/')) {
    const blogSlug = normalizedPath.replace(/^\/blog\//, '').trim();
    const BLOG_PAIRS: Record<string, { de: string; en: string }> = {
      'puresim-esim-cash-cashback-programm': {
        de: 'puresim-esim-cash-cashback-programm',
        en: 'puresim-esim-cash-cashback-program-save-on-every-plan-purchase',
      },
      'puresim-esim-cash-cashback-program-save-on-every-plan-purchase': {
        de: 'puresim-esim-cash-cashback-programm',
        en: 'puresim-esim-cash-cashback-program-save-on-every-plan-purchase',
      },
      'esim-kompatibilitaet-2026-geraete-anbieter-update-puresim': {
        de: 'esim-kompatibilitaet-2026-geraete-anbieter-update-puresim',
        en: 'esim-compatibility-2026-which-devices-and-providers-really-support-it',
      },
      'esim-compatibility-2026-which-devices-and-providers-really-support-it': {
        de: 'esim-kompatibilitaet-2026-geraete-anbieter-update-puresim',
        en: 'esim-compatibility-2026-which-devices-and-providers-really-support-it',
      },
      'puresim-esim-7-vorteile-reisende': {
        de: 'puresim-esim-7-vorteile-reisende',
        en: 'esim-for-travel-the-7-key-benefits-for-vacationers-and-business-travelers',
      },
      'esim-for-travel-the-7-key-benefits-for-vacationers-and-business-travelers': {
        de: 'puresim-esim-7-vorteile-reisende',
        en: 'esim-for-travel-the-7-key-benefits-for-vacationers-and-business-travelers',
      },
      'neue-esim-anbieter-2026-guenstigste-schnellste-tarife-puresim': {
        de: 'neue-esim-anbieter-2026-guenstigste-schnellste-tarife-puresim',
        en: 'new-esim-providers-2025-cheapest-fastest-plans',
      },
      'new-esim-providers-2025-cheapest-fastest-plans': {
        de: 'neue-esim-anbieter-2026-guenstigste-schnellste-tarife-puresim',
        en: 'new-esim-providers-2025-cheapest-fastest-plans',
      },
      'puresim-esim-aktivieren-schritt-fuer-schritt-anleitung-ios-android': {
        de: 'puresim-esim-aktivieren-schritt-fuer-schritt-anleitung-ios-android',
        en: 'activate-esim-step-by-step-guide-ios-android',
      },
      'activate-esim-step-by-step-guide-ios-android': {
        de: 'puresim-esim-aktivieren-schritt-fuer-schritt-anleitung-ios-android',
        en: 'activate-esim-step-by-step-guide-ios-android',
      },
      'data-only-esim-alternative-reisende': {
        de: 'data-only-esim-alternative-reisende',
        en: 'what-is-an-esim-the-ultimate-guide-to-the-digital-sim-card',
      },
      'what-is-an-esim-the-ultimate-guide-to-the-digital-sim-card': {
        de: 'data-only-esim-alternative-reisende',
        en: 'what-is-an-esim-the-ultimate-guide-to-the-digital-sim-card',
      },
      'esim-firmenhandys-sicherheitsvorteile-verwaltung': {
        de: 'esim-firmenhandys-sicherheitsvorteile-verwaltung',
        en: 'esim-for-company-phones-security-benefits-and-easy-management',
      },
      'esim-for-company-phones-security-benefits-and-easy-management': {
        de: 'esim-firmenhandys-sicherheitsvorteile-verwaltung',
        en: 'esim-for-company-phones-security-benefits-and-easy-management',
      },
      'esim-iot-smart-home-vorteile-puresim': {
        de: 'esim-iot-smart-home-vorteile-puresim',
        en: 'esim-in-the-iot-world-benefits-for-smart-home-devices-and-connected-technology',
      },
      'esim-in-the-iot-world-benefits-for-smart-home-devices-and-connected-technology': {
        de: 'esim-iot-smart-home-vorteile-puresim',
        en: 'esim-in-the-iot-world-benefits-for-smart-home-devices-and-connected-technology',
      },
      'puresim-esim-nachhaltigkeit-umwelt': {
        de: 'puresim-esim-nachhaltigkeit-umwelt',
        en: 'sustainability-through-esim-how-avoiding-plastic-sims-protects-the-environment',
      },
      'sustainability-through-esim-how-avoiding-plastic-sims-protects-the-environment': {
        de: 'puresim-esim-nachhaltigkeit-umwelt',
        en: 'sustainability-through-esim-how-avoiding-plastic-sims-protects-the-environment',
      },
      'esim-netzabdeckung-2026-ausblick-puresim': {
        de: 'esim-netzabdeckung-2026-ausblick-puresim',
        en: 'esim-network-coverage-2025-best-providers-worldwide-connected-globally-puresim',
      },
      'esim-network-coverage-2025-best-providers-worldwide-connected-globally-puresim': {
        de: 'esim-netzabdeckung-2026-ausblick-puresim',
        en: 'esim-network-coverage-2025-best-providers-worldwide-connected-globally-puresim',
      },
      'non-hk-ip-routing-esim-funktion-erklaert': {
        de: 'non-hk-ip-routing-esim-funktion-erklaert',
        en: 'non-hk-ip-routing-how-your-esim-routes-data',
      },
      'non-hk-ip-routing-how-your-esim-routes-data': {
        de: 'non-hk-ip-routing-esim-funktion-erklaert',
        en: 'non-hk-ip-routing-how-your-esim-routes-data',
      },
      'valueshop25-wird-puresim-net-rebranding': {
        de: 'valueshop25-wird-puresim-net-rebranding',
        en: 'valueshop25-com-becomes-puresim-net-the-new-name-for-global-data-esims',
      },
      'valueshop25-com-becomes-puresim-net-the-new-name-for-global-data-esims': {
        de: 'valueshop25-wird-puresim-net-rebranding',
        en: 'valueshop25-com-becomes-puresim-net-the-new-name-for-global-data-esims',
      },
    };

    const pair = BLOG_PAIRS[blogSlug];
    if (pair) {
      if (detectedLocale === 'en' && blogSlug !== pair.en) {
        return NextResponse.redirect(new URL(`/en/blog/${pair.en}`, request.url), 301);
      }
      if (detectedLocale === 'de' && blogSlug !== pair.de) {
        return NextResponse.redirect(new URL(`/blog/${pair.de}`, request.url), 301);
      }
    }
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
        /^\/(tariffs|esim|unlimited|cart|checkout|dashboard|login|register|reviews|blog|agb|datenschutz|refund-policy|order|topup)/i.test(normalizedPath)
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

  // 404 detection strictly for page routes
  const isExemptFrom404 =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sitemap/') ||
    pathname === '/llms.txt' ||
    pathname.includes('.');

  const VALID_PAGE_ROUTE_REGEX = /^\/(ai|cart|checkout|order|tariffs|esim|unlimited|configurator|blog|reviews|dashboard|agb|datenschutz|refund-policy|login|register|topup|success)(\/|$)/i;

  const isValidPageRoute =
    normalizedPath === '/' ||
    VALID_PAGE_ROUTE_REGEX.test(normalizedPath) ||
    /^\/[a-zA-Z0-9_-]+\/[0-9]+$/.test(normalizedPath);

  let isKnownCountryOrRegion = true;
  if (normalizedPath.startsWith('/esim/')) {
    const slug = normalizedPath.replace(/^\/esim\//, '').split('/')[0].trim();
    if (!slug || !resolveCountryOrRegionCode(slug)) {
      isKnownCountryOrRegion = false;
    }
  } else if (normalizedPath.startsWith('/unlimited/')) {
    const slug = normalizedPath.replace(/^\/unlimited\//, '').split('/')[0].trim();
    const code = slug ? resolveCountryOrRegionCode(slug) : null;
    if (!code || !UNLIMITED_ENABLED_CODES.has(code)) {
      isKnownCountryOrRegion = false;
    }
  }

  const is404Route = !isExemptFrom404 && (!isValidPageRoute || !isKnownCountryOrRegion);

  if (is404Route) {
    const isRsc = request.headers.has('rsc') ||
                  request.headers.has('next-router-prefetch') ||
                  request.headers.has('next-router-state-tree') ||
                  (request.headers.get('accept') || '').includes('text/x-component') ||
                  request.nextUrl.searchParams.has('_rsc') ||
                  request.url.includes('_rsc=');

    if (!isRsc) {
      return new NextResponse(render404Html(detectedLocale), {
        status: 404,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'x-robots-tag': 'noindex, nofollow',
        },
      });
    }

    return new NextResponse('', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  }

  let effectiveLocale = detectedLocale;
  if (!isPrefixed && normalizedPath.startsWith('/checkout/crypto/')) {
    const qLoc = request.nextUrl.searchParams.get('lang') || request.nextUrl.searchParams.get('locale');
    const cLoc = request.cookies.get('locale')?.value;
    if (qLoc && isValidLocale(qLoc)) effectiveLocale = qLoc;
    else if (cLoc && isValidLocale(cLoc)) effectiveLocale = cLoc;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', effectiveLocale);
  requestHeaders.set('x-pathname', pathname);
  requestHeaders.set('x-is-404', is404Route ? '1' : '0');

  let response: NextResponse;
  if (isPrefixed) {
    const internalUrl = new URL(normalizedPath + request.nextUrl.search, request.url);
    response = NextResponse.rewrite(internalUrl, {
      request: { headers: requestHeaders },
    });
  } else {
    response = NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (normalizedPath.startsWith('/checkout')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

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

  // ── Persist visitor's active language preference to cookie (only on true top-level HTML document navigations, NEVER on prefetch, RSC, API, 404, or language-neutral pages) ──
  const isApiRequest = pathname.startsWith('/api/');
  const rscHeader = (request.headers.get('rsc') || '').toLowerCase();
  const nextRouterPrefetch = (request.headers.get('next-router-prefetch') || '').toLowerCase();
  const nextRouterStateTree = (request.headers.get('next-router-state-tree') || '').toLowerCase();
  const nextUrl = (request.headers.get('next-url') || '').toLowerCase();
  const xIsRsc = (request.headers.get('x-is-rsc') || '').toLowerCase();
  const xNextPrefetch = (request.headers.get('x-next-prefetch') || '').toLowerCase();
  const xNextState = (request.headers.get('x-next-state') || '').toLowerCase();
  const purpose = (request.headers.get('purpose') || '').toLowerCase();
  const secPurpose = (request.headers.get('sec-purpose') || '').toLowerCase();
  const xMiddlewarePrefetch = request.headers.get('x-middleware-prefetch') === '1';
  const acceptHeader = (request.headers.get('accept') || '').toLowerCase();
  const secFetchMode = (request.headers.get('sec-fetch-mode') || '').toLowerCase();
  const secFetchDest = (request.headers.get('sec-fetch-dest') || '').toLowerCase();

  const isRscOrPrefetch =
    rscHeader === '1' ||
    Boolean(request.headers.get('rsc')) ||
    xIsRsc === '1' ||
    Boolean(request.headers.get('x-is-rsc')) ||
    Boolean(nextRouterPrefetch) ||
    Boolean(xNextPrefetch) ||
    Boolean(nextRouterStateTree) ||
    Boolean(xNextState) ||
    Boolean(nextUrl) ||
    purpose.includes('prefetch') ||
    secPurpose.includes('prefetch') ||
    xMiddlewarePrefetch ||
    acceptHeader.includes('text/x-component') ||
    request.nextUrl.searchParams.has('_rsc') ||
    request.nextUrl.search.includes('_rsc=') ||
    request.url.includes('_rsc=') ||
    pathname.includes('_rsc=');

  const isNeutralOrExcludedPath =
    normalizedPath === '/topup' ||
    normalizedPath === '/login' ||
    normalizedPath === '/register' ||
    normalizedPath === '/reviews' ||
    normalizedPath === '/notfound' ||
    normalizedPath === '/404';

  // Must be an explicit top-level HTML document navigation
  const isHtmlNavigation =
    (secFetchMode === 'navigate' || secFetchDest === 'document' || !secFetchMode) &&
    acceptHeader.includes('text/html') &&
    !isRscOrPrefetch;

  if (
    isPrefixed &&
    isStandardUserRoute &&
    isKnownCountryOrRegion &&
    isHtmlNavigation &&
    !isApiRequest &&
    !isNeutralOrExcludedPath &&
    !pathname.includes('.')
  ) {
    if (request.cookies.get('locale')?.value !== detectedLocale) {
      response.cookies.set('locale', detectedLocale, {
        path:     '/',
        maxAge:   60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
  }

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_ROUTES.some((route) =>
    normalizedPath.startsWith(route)
  );
  if (isProtected && !user) {
    const loginUrl = new URL(`${langPrefix}/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  if (user && (normalizedPath === '/login' || normalizedPath === '/register')) {
    return NextResponse.redirect(new URL(`${langPrefix}/dashboard`, request.url));
  }

  // ── Security Headers & Response Hygiene ──
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ── Cache-Control for public static/ISR storefront pages (ensures Cloudflare caches all 15 languages identically to German) ──
  const isPublicCatalogRoute =
    normalizedPath === '/tariffs' ||
    normalizedPath.startsWith('/tariffs/') ||
    normalizedPath.startsWith('/esim/') ||
    normalizedPath.startsWith('/unlimited/') ||
    normalizedPath === '/ai';

  if (!user && isPublicCatalogRoute && !refCode && request.method === 'GET' && !isApiRequest && !pathname.includes('.')) {
    // If not already set with a public cache policy, emit public caching for Cloudflare
    response.headers.set(
      'Cache-Control',
      'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400'
    );
  }

  // Strip internal next.js middleware cookie header from public responses
  if (response.headers.has('x-middleware-set-cookie')) {
    response.headers.delete('x-middleware-set-cookie');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
