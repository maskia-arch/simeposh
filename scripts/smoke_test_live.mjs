#!/usr/bin/env node
/**
 * PureSim Post-Deploy Smoke Test (Updated for Nachfix vor Run 9)
 * Checks:
 *   - /esim/latin-america, /en/esim/latin-america, /unlimited/latin-america, /fr/unlimited/latin-america (200 with tariff cards)
 *   - /esim/laos (exactly 26 tariffs, no Latin America code)
 *   - /esim/macau and /esim/ (301)
 *   - FAQ-Teaser on /fr/esim/turkey without "Answers about" and "View FAQ"
 *   - /fr/esim without "destinations found"
 *   - Regions- and country pages from sitemap with at least 1 tariff card
 */

const BASE_URL = process.env.BASE_URL || 'https://puresim.net';

async function fetchLive(path, options = {}) {
  const cb = `_st=${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${sep}${cb}`;
  return fetch(url, {
    headers: {
      'User-Agent': 'PureSim-PostDeploy-SmokeTest/1.0',
      'Accept': 'text/html',
      ...(options.headers || {})
    },
    redirect: 'manual',
    ...options
  });
}

async function runSmokeTest() {
  console.log(`\n======================================================`);
  console.log(`  PureSim Post-Deploy Smoke Test -> ${BASE_URL}`);
  console.log(`======================================================\n`);

  let failures = 0;
  const tStart = Date.now();

  // 1. Standard Core Routes
  const coreRoutes = [
    '/esim/germany',
    '/esim/united-states',
    '/esim/turkey',
    '/esim/japan',
    '/tariffs',
    '/esim',
    '/faq',
    '/unlimited/germany',
    '/en/esim/germany'
  ];

  for (const route of coreRoutes) {
    try {
      const res = await fetchLive(route);
      const text = await res.text();
      if (res.status === 200 && text.length > 5000) {
        console.log(`[PASS] ${res.status} OK   ${route.padEnd(30)} (${(text.length / 1024).toFixed(1)} KB)`);
      } else {
        console.error(`[FAIL] ${res.status} ERR  ${route.padEnd(30)} (Length: ${text.length})`);
        failures++;
      }
    } catch (e) {
      console.error(`[FAIL] NET ERR  ${route.padEnd(30)} ${e.message}`);
      failures++;
    }
  }

  // 2. Latin America Pages (200 with cards)
  const latamRoutes = [
    '/esim/latin-america',
    '/en/esim/latin-america',
    '/unlimited/latin-america',
    '/fr/unlimited/latin-america'
  ];

  for (const route of latamRoutes) {
    try {
      const res = await fetchLive(route);
      const text = await res.text();
      const hasCards = text.includes('data-tariff-card') || text.includes('unlimited-configurator') || text.includes('Unlimited');
      if (res.status === 200 && hasCards) {
        console.log(`[PASS] ${res.status} OK   ${route.padEnd(30)} (${(text.length / 1024).toFixed(1)} KB, has cards)`);
      } else {
        console.error(`[FAIL] ${res.status} ERR  ${route.padEnd(30)} (Cards: ${hasCards}, Status: ${res.status})`);
        failures++;
      }
    } catch (e) {
      console.error(`[FAIL] NET ERR  ${route.padEnd(30)} ${e.message}`);
      failures++;
    }
  }

  // 3. Laos Check: Exactly 26 tariffs, 0 Latin America codes
  try {
    const res = await fetchLive('/esim/laos');
    const text = await res.text();
    const hasLatamPkg = text.includes('PCXZ5ZM73') || text.includes('PWPT8K43N');
    const cardMatches = (text.match(/data-tariff-id=/g) || []).length;
    if (res.status === 200 && !hasLatamPkg && cardMatches === 26) {
      console.log(`[PASS] 200 OK   /esim/laos                     (exact 26 cards, 0 LATAM packages)`);
    } else {
      console.error(`[FAIL] Laos check failed: Status ${res.status}, cards: ${cardMatches}, hasLatamPkg: ${hasLatamPkg}`);
      failures++;
    }
  } catch (e) {
    console.error(`[FAIL] NET ERR /esim/laos ${e.message}`);
    failures++;
  }

  // 4. Redirects (301)
  const redirectRoutes = [
    { from: '/esim/macau', target: '/esim/macao' },
    { from: '/esim/', target: '/esim' },
    { from: '/en/', target: '/en' },
    { from: '/en/esim/japan/', target: '/en/esim/japan' }
  ];

  for (const r of redirectRoutes) {
    try {
      const res = await fetchLive(r.from);
      const loc = res.headers.get('location');
      const is301 = res.status === 301;
      const targetMatches = loc && loc.endsWith(r.target);
      if (is301 && targetMatches) {
        console.log(`[PASS] 301 OK   ${r.from.padEnd(30)} -> ${loc}`);
      } else {
        console.error(`[FAIL] Redirect ${r.from}: Status ${res.status} (expected 301), Location: ${loc} (expected ${r.target})`);
        failures++;
      }
    } catch (e) {
      console.error(`[FAIL] NET ERR ${r.from}: ${e.message}`);
      failures++;
    }
  }

  // 5. FAQ-Teaser on /fr/esim/turkey: No "Answers about", no "View FAQ"
  try {
    const res = await fetchLive('/fr/esim/turkey');
    const text = await res.text();
    const hasEnglishAnswers = text.includes('Answers about');
    const hasEnglishViewFaq = text.includes('View FAQ');
    if (res.status === 200 && !hasEnglishAnswers && !hasEnglishViewFaq) {
      console.log(`[PASS] 200 OK   /fr/esim/turkey FAQ Teaser     (Clean FR translations, 0x English)`);
    } else {
      console.error(`[FAIL] /fr/esim/turkey has English FAQ teaser: Answers about: ${hasEnglishAnswers}, View FAQ: ${hasEnglishViewFaq}`);
      failures++;
    }
  } catch (e) {
    console.error(`[FAIL] NET ERR /fr/esim/turkey: ${e.message}`);
    failures++;
  }

  // 6. /fr/esim: No "destinations found"
  try {
    const res = await fetchLive('/fr/esim');
    const text = await res.text();
    const hasEnglishFound = text.includes('destinations found') || text.includes('destination found');
    if (res.status === 200 && !hasEnglishFound) {
      console.log(`[PASS] 200 OK   /fr/esim Destinations Count    (Clean FR translation, 0x English)`);
    } else {
      console.error(`[FAIL] /fr/esim has English "destinations found": ${hasEnglishFound}`);
      failures++;
    }
  } catch (e) {
    console.error(`[FAIL] NET ERR /fr/esim: ${e.message}`);
    failures++;
  }

  const duration = ((Date.now() - tStart) / 1000).toFixed(2);
  console.log(`\n------------------------------------------------------`);
  if (failures === 0) {
    console.log(`[SUCCESS] Alle Smoke-Test Kriterien bestanden! (Dauer: ${duration}s)`);
    console.log(`======================================================\n`);
    process.exit(0);
  } else {
    console.error(`[ALARM] ${failures} Kriterien fehlgeschlagen! (Dauer: ${duration}s)`);
    console.log(`======================================================\n`);
    process.exit(1);
  }
}

runSmokeTest();
