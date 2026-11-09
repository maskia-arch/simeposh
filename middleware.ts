import { NextResponse, type NextRequest } from 'next/server';
import { detectLocale, countryFromHeaders } from '@/lib/i18n/detect';
import { isValidLocale } from '@/lib/i18n/config';
import { verifyJwt } from '@/lib/auth/jwt';
import { resolveCountryOrRegionCode, countryCodeToSlug, ACTIVE_DESTINATION_CODES } from '@/lib/destinations-shared';
import { TARIFF_DUPLICATE_REDIRECTS } from '@/lib/duplicate-tariffs';
import { GUIDE_SLUGS } from '@/lib/guide-links';
import { checkOrderRateLimit } from '@/lib/rate-limit';

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
    /^\/(ai|cart|checkout|order|tariffs|esim|unlimited|configurator|blog|reviews|dashboard|agb|datenschutz|refund-policy|login|register|forgot-password|reset-password|topup|success|s|esim-overview|faq|telegram)(\/|$)/i.test(normalizedPath) ||
    /^\/[a-zA-Z0-9_-]+\/[0-9]+$/.test(normalizedPath) ||
    pathname.startsWith('/api/');

  // ── Admin Route Protection ──
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin') || normalizedPath.startsWith('/admin')) {
    const token = request.cookies.get('session_token')?.value;
    const user = token ? await verifyJwt(token) : null;
    if (!user) {
      return new NextResponse(null, {
        status: 401,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'Content-Type': 'text/plain',
        },
      });
    }
    if (user.role !== 'admin') {
      return new NextResponse(null, {
        status: 403,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'Content-Type': 'text/plain',
        },
      });
    }
  }

  // Rate limiting for order status access via query param
  if (normalizedPath === '/order' && request.nextUrl.searchParams.has('ref')) {
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
    const rl = checkOrderRateLimit(clientIp);
    if (!rl.allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfter || 60),
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'Content-Type': 'text/plain',
        },
      });
    }
  }

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
    const cleanP = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    const redirectUrl = new URL(cleanP + request.nextUrl.search, `https://${canonicalHost}`);
    return NextResponse.redirect(redirectUrl, 301);
  }

  // ── 301 Permanent Redirect /de or /de/* to root / or /* (single hop, strip trailing slashes) ──
  if (pathname === '/de' || pathname === '/de/') {
    return NextResponse.redirect(new URL('/' + request.nextUrl.search, request.url), 301);
  }
  if (pathname.startsWith('/de/')) {
    const deTarget = pathname.replace(/^\/de/, '').replace(/\/+$/, '') || '/';
    return NextResponse.redirect(new URL(deTarget + request.nextUrl.search, request.url), 301);
  }

  // ── 301 Redirect canonical country aliases for /esim/{alias} -> /esim/{slug} ──
  const cleanNorm = normalizedPath.length > 1 ? normalizedPath.replace(/\/+$/, '') : normalizedPath;
  if (cleanNorm.startsWith('/esim/')) {
    const slug = cleanNorm.replace(/^\/esim\//, '').split('/')[0].trim();
    if (slug) {
      const code = resolveCountryOrRegionCode(slug);
      if (code && ACTIVE_DESTINATION_CODES.has(code)) {
        const canonicalSlug = countryCodeToSlug(code, slug);
        if (canonicalSlug && slug.toLowerCase() !== canonicalSlug) {
          return NextResponse.redirect(new URL(`${langPrefix}/esim/${canonicalSlug}${request.nextUrl.search}`, request.url), 301);
        }
      }
    }
  }

  // ── 301 Redirect /unlimited/{alias} -> canonical, and countries without unlimited -> /esim/{slug} ──
  const NO_UNLIMITED_CODES = new Set(['CF', 'GG', 'JM', 'LR', 'MG', 'ML', 'MZ', 'PR', 'SD']);
  if (cleanNorm.startsWith('/unlimited/')) {
    const slug = cleanNorm.replace(/^\/unlimited\//, '').split('/')[0].trim();
    if (slug) {
      const code = resolveCountryOrRegionCode(slug);
      if (code && ACTIVE_DESTINATION_CODES.has(code)) {
        const canonicalSlug = countryCodeToSlug(code, slug);
        if (NO_UNLIMITED_CODES.has(code)) {
          return NextResponse.redirect(new URL(`${langPrefix}/esim/${canonicalSlug}${request.nextUrl.search}`, request.url), 301);
        }
        if (canonicalSlug && slug.toLowerCase() !== canonicalSlug) {
          return NextResponse.redirect(new URL(`${langPrefix}/unlimited/${canonicalSlug}${request.nextUrl.search}`, request.url), 301);
        }
      }
    }
  }

  // ── 301 Redirect trailing slash to non-trailing slash (preserve query string) ──
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const cleanPath = pathname.replace(/\/+$/, '');
    return NextResponse.redirect(new URL(cleanPath + request.nextUrl.search, request.url), 301);
  }

  // ── 301 Redirect /topup with iccid query param: strip iccid permanently ──
  if (normalizedPath === '/topup' && request.nextUrl.searchParams.has('iccid')) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('iccid');
    return NextResponse.redirect(cleanUrl, 301);
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

  // ── 301 Redirect 14 hidden USA duplicate tariffs: /tariffs/{duplicateSlug} -> /tariffs/{winnerSlug} ──
  if (normalizedPath.startsWith('/tariffs/')) {
    const slug = normalizedPath.replace(/^\/tariffs\//, '').trim();
    if (slug && TARIFF_DUPLICATE_REDIRECTS[slug]) {
      const winnerSlug = TARIFF_DUPLICATE_REDIRECTS[slug];
      return NextResponse.redirect(new URL(`${langPrefix}/tariffs/${winnerSlug}`, request.url), 301);
    }
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

  // ── Rewrite bare /unlimited or /configurator without country -> /unlimited/germany (200 OK) ──
  if (normalizedPath === '/configurator') {
    return NextResponse.redirect(new URL(`${langPrefix}/unlimited`, request.url), 301);
  }

  // ── 301 Redirect /tgcontact, /contact, /kontakt, /support -> /telegram ──
  if (
    normalizedPath === '/tgcontact' ||
    normalizedPath === '/contact' ||
    normalizedPath === '/kontakt' ||
    normalizedPath === '/support'
  ) {
    const res = NextResponse.redirect(new URL(`${langPrefix}/telegram${request.nextUrl.search}`, request.url), 301);
    res.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    return res;
  }

  // ── 301 Redirect mismatched blog slugs between German (/blog/...) and English (/en/blog/...) ──
  if (normalizedPath.startsWith('/blog/')) {
    const blogSlug = normalizedPath.replace(/^\/blog\//, '').trim();

    // ── 301 Redirect 15-language blog guide slugs to the authoritative language slug ──
    const allGuideSlugs = new Set(Object.values(GUIDE_SLUGS));
    if (allGuideSlugs.has(blogSlug)) {
      const expectedSlug = GUIDE_SLUGS[detectedLocale] || GUIDE_SLUGS.en;
      if (blogSlug !== expectedSlug) {
        const targetPath = detectedLocale === 'de' ? `/blog/${expectedSlug}` : `/${detectedLocale}/blog/${expectedSlug}`;
        const res = NextResponse.redirect(new URL(targetPath + request.nextUrl.search, request.url), 301);
        res.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
        return res;
      }
    }

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
      // 1. If path is already /esim-overview/... or /setup-view/..., allow pass-through
      if (pathname.startsWith('/esim-overview') || pathname.startsWith('/setup-view')) {
        // Proceed normally
      }
      // 2. If path is /s/... (the opaque setup token route), allow pass-through
      else if (pathname.startsWith('/s/')) {
        // Proceed normally
      }
      // 3. If path is root '/' or webshop route, REDIRECT to main domain (puresim.net)
      else if (
        pathname === '/' ||
        /^\/(tariffs|esim|unlimited|cart|checkout|dashboard|login|register|reviews|blog|agb|datenschutz|refund-policy|order|topup|telegram|faq)/i.test(normalizedPath)
      ) {
        return NextResponse.redirect(new URL(pathname + request.nextUrl.search, `https://${mainDomain}`), 302);
      }
      // 4. Any other unknown route on esim.puresim.net -> proceed to Next.js catchall 404 (rendered HTML shell)
    }
  } else {
    // On main domain (puresim.net), allow /esim-overview/... to proceed directly to route.ts for 301 to /s/<token>
    if (pathname.startsWith('/esim-overview/')) {
      // Proceed normally
    }
  }

  // 404 detection strictly for page routes
  const isExemptFrom404 =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    normalizedPath.startsWith('/auth/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sitemap/') ||
    pathname === '/llms.txt' ||
    pathname.includes('.');

  const VALID_PAGE_ROUTE_REGEX = /^\/(ai|cart|checkout|order|tariffs|esim|unlimited|configurator|blog|reviews|dashboard|agb|datenschutz|refund-policy|login|register|forgot-password|reset-password|topup|success|s|faq|telegram)(\/|$)/i;

  const isValidPageRoute =
    normalizedPath === '/' ||
    VALID_PAGE_ROUTE_REGEX.test(normalizedPath) ||
    /^\/[a-zA-Z0-9_-]+\/[0-9]+$/.test(normalizedPath);

  let isKnownCountryOrRegion = true;
  if (normalizedPath.startsWith('/esim/')) {
    const slug = normalizedPath.replace(/^\/esim\//, '').split('/')[0].trim().toLowerCase();
    const code = slug ? resolveCountryOrRegionCode(slug) : null;
    if (!slug || !code || !ACTIVE_DESTINATION_CODES.has(code)) {
      isKnownCountryOrRegion = false;
    }
  } else if (normalizedPath.startsWith('/unlimited/')) {
    const slug = normalizedPath.replace(/^\/unlimited\//, '').split('/')[0].trim().toLowerCase();
    const code = slug ? resolveCountryOrRegionCode(slug) : null;
    if (!code || !ACTIVE_DESTINATION_CODES.has(code)) {
      isKnownCountryOrRegion = false;
    }
  } else if (normalizedPath.startsWith('/tariffs/')) {
    const tariffSlug = normalizedPath.replace(/^\/tariffs\//, '').split('/')[0].trim().toLowerCase();
    const legacyMatch = tariffSlug.match(/^([a-z0-9_-]+)_(\d+(?:\.\d+)?|\d+)_(\d+)$/i);
    if (legacyMatch) {
      const code = resolveCountryOrRegionCode(legacyMatch[1]);
      if (!code || !ACTIVE_DESTINATION_CODES.has(code)) {
        isKnownCountryOrRegion = false;
      }
    } else if (tariffSlug === 'xyz' || tariffSlug === 'not-found') {
      isKnownCountryOrRegion = false;
    }
  }

  const is404Route = !isExemptFrom404 && (!isValidPageRoute || !isKnownCountryOrRegion);

  // is404Route is handled natively by Next.js app/not-found.tsx inside standard layout

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
  if (is404Route) {
    const notFoundTarget = new URL(isPrefixed ? `/${detectedLocale}/404` : '/404', request.url);
    response = NextResponse.rewrite(notFoundTarget, {
      status: 404,
      request: { headers: requestHeaders },
    });
  } else if (isPrefixed) {
    const internalUrl = new URL(normalizedPath + request.nextUrl.search, request.url);
    response = NextResponse.rewrite(internalUrl, {
      status: 200,
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
    if (is404Route) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    }
    if (normalizedPath.startsWith('/s/')) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    }

  // ── Affiliate Referral Link cookie tracker ──
  // Only trigger on shop pages (e.g. /?ref= or /esim/*?ref=), NEVER on /api/* or /order/*
  const refCode = request.nextUrl.searchParams.get('ref');
  const isExcludedFromAffiliate = pathname.startsWith('/api') || pathname.startsWith('/order') || pathname.startsWith('/s/') || pathname === '/s';
  if (refCode && !isExcludedFromAffiliate) {
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

  const isRscRequest = Boolean(
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
    pathname.includes('_rsc=')
  );

  const isRscOrPrefetch = isRscRequest;

  const isNeutralOrExcludedPath =
    normalizedPath === '/esim' ||
    normalizedPath === '/faq' ||
    normalizedPath === '/topup' ||
    normalizedPath === '/login' ||
    normalizedPath === '/register' ||
    normalizedPath === '/forgot-password' ||
    normalizedPath === '/reset-password' ||
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
    const redirectRes = NextResponse.redirect(loginUrl);
    redirectRes.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    return redirectRes;
  }

  // Redirect logged-in users away from auth pages
  if (user && (normalizedPath === '/login' || normalizedPath === '/register' || normalizedPath === '/forgot-password' || normalizedPath === '/reset-password')) {
    return NextResponse.redirect(new URL(`${langPrefix}/dashboard`, request.url));
  }

  const isOrderRoute = normalizedPath === '/order' || normalizedPath.startsWith('/order') || normalizedPath.startsWith('/api/order/status');
  const isSetupRoute = normalizedPath === '/s' || normalizedPath.startsWith('/s/') || normalizedPath.startsWith('/setup-view');

  // ── Security Headers & Response Hygiene ──
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  if (isOrderRoute) {
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else {
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // ── Cache-Control for storefront pages (Cloudflare caching & fresh pricing) ──
  const isHomepage = normalizedPath === '/';
  const isPriceBearingRoute =
    normalizedPath === '/topup' ||
    normalizedPath === '/tariffs' ||
    normalizedPath.startsWith('/tariffs/') ||
    normalizedPath.startsWith('/esim/') ||
    normalizedPath.startsWith('/unlimited/');

  if (isSetupRoute) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else if (normalizedPath === '/topup' && request.nextUrl.search) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  } else if (pathname.startsWith('/esim-overview')) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }

  const isCartOrCheckout =
    normalizedPath.startsWith('/cart') ||
    normalizedPath.startsWith('/checkout') ||
    normalizedPath.startsWith('/api/crypto/checkout');

  const isNoStoreRoute = isCartOrCheckout || isOrderRoute || isSetupRoute || is404Route;

  if (isRscRequest) {
    // RSC responses must NEVER be cached by edge CDN or proxies
    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding');
  } else if (isNoStoreRoute || isHomepage || normalizedPath === '' || isProtected) {
    // HTML with Session/Build-Bezug: /, /{lang}, /cart, /order, /dashboard
    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding');
  } else if (!user && isPriceBearingRoute && !refCode && request.method === 'GET' && !isApiRequest && !pathname.includes('.')) {
    // Cacheable storefront pages: /tariffs, /esim/*, /unlimited/*
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=300');
    response.headers.set('CDN-Cache-Control', 'max-age=300');
    response.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding');
  } else if (!user && (normalizedPath.startsWith('/blog') || normalizedPath === '/reviews' || normalizedPath === '/agb' || normalizedPath === '/datenschutz' || normalizedPath === '/refund-policy' || normalizedPath === '/telegram' || normalizedPath === '/faq') && !refCode && request.method === 'GET' && !isApiRequest && !pathname.includes('.')) {
    // Static informational / legal pages: 1 hour edge cache
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'max-age=3600');
    response.headers.set('CDN-Cache-Control', 'max-age=3600');
    response.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding');
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
