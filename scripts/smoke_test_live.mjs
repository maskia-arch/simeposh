#!/usr/bin/env node
/**
 * PureSim Post-Deploy Smoke Test
 * Führt nach jedem Deploy einen automatisierten Health-Check gegen https://puresim.net aus.
 * Prüft die 10 wichtigsten Länderseiten, Übersicht, Tarife und FAQ.
 * 
 * Verwendung:
 *   node scripts/smoke_test_live.mjs
 *   BASE_URL=https://puresim.net node scripts/smoke_test_live.mjs
 */

const BASE_URL = process.env.BASE_URL || 'https://puresim.net';

const ROUTES_TO_CHECK = [
  '/esim/germany',
  '/esim/united-states',
  '/esim/turkey',
  '/esim/japan',
  '/esim/thailand',
  '/esim/spain',
  '/esim/italy',
  '/esim/france',
  '/esim/united-kingdom',
  '/esim/switzerland',
  '/tariffs',
  '/esim',
  '/faq',
  '/unlimited/germany',
  '/en/esim/germany'
];

async function runSmokeTest() {
  console.log(`\n======================================================`);
  console.log(`  PureSim Post-Deploy Smoke Test -> ${BASE_URL}`);
  console.log(`======================================================\n`);

  let failures = 0;
  const tStart = Date.now();

  for (const route of ROUTES_TO_CHECK) {
    const cacheBuster = `_st=${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const url = `${BASE_URL}${route}?${cacheBuster}`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'PureSim-PostDeploy-SmokeTest/1.0',
          'Accept': 'text/html'
        },
        redirect: 'manual'
      });

      const status = res.status;
      const contentType = res.headers.get('content-type') || '';

      if (status >= 200 && status < 300) {
        // Prüfen, ob HTML echter Inhalt ist
        const text = await res.text();
        const hasTariffOrFaq = text.includes('PureSim') && (text.includes('Tarif') || text.includes('eSIM') || text.includes('FAQ') || text.includes('Frage'));
        if (hasTariffOrFaq && text.length > 5000) {
          console.log(`[PASS] ${status} OK   ${route.padEnd(25)} (${(text.length / 1024).toFixed(1)} KB)`);
        } else {
          console.error(`[FAIL] ${status} BODY ${route.padEnd(25)} Unerwartet kleiner Body (${text.length} Bytes)`);
          failures++;
        }
      } else {
        console.error(`[FAIL] ${status} ERR  ${route.padEnd(25)}`);
        failures++;
      }
    } catch (err) {
      console.error(`[FAIL] NET ERR  ${route.padEnd(25)} ${err.message}`);
      failures++;
    }
  }

  const duration = ((Date.now() - tStart) / 1000).toFixed(2);
  console.log(`\n------------------------------------------------------`);
  if (failures === 0) {
    console.log(`[SUCCESS] Alle ${ROUTES_TO_CHECK.length} Routen erfolgreich getestet (Dauer: ${duration}s).`);
    console.log(`======================================================\n`);
    process.exit(0);
  } else {
    console.error(`[ALARM] ${failures} von ${ROUTES_TO_CHECK.length} Routen fehlgeschlagen! (Dauer: ${duration}s)`);
    console.log(`======================================================\n`);
    process.exit(1);
  }
}

runSmokeTest();
