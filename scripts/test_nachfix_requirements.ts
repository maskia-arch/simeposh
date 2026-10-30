import { Pool } from 'pg';
import { getAllDestinations, getDestinationBySlug } from '../lib/destinations';
import { formatCountriesWithUnit, formatDestinationsFound, getPerDayAriaUnit } from '../lib/i18n/plural';
import { CUSTOM_ALIASES, resolveCountryOrRegionCode, countryCodeToSlug } from '../lib/destinations-shared';
import * as fs from 'fs';
import * as path from 'path';

process.loadEnvFile('.env.local');

async function testAll() {
  console.log('=== Running Test Suite for Nachfix vor Run 9 ===\n');

  // ── 1. DB & Tariff Counts ──────────────────────────────────────────────────
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const latamRes = await pool.query(`
    SELECT tariff_type, is_premium, count(*)::int as count
    FROM tariffs
    WHERE country_code = 'LATAM' AND is_active = true
    GROUP BY tariff_type, is_premium
    ORDER BY tariff_type, is_premium
  `);
  console.log('1.1 LATAM tariffs in DB:', latamRes.rows);

  const latamTotal = latamRes.rows.reduce((sum, r) => sum + r.count, 0);
  if (latamTotal !== 25) {
    throw new Error(`Expected exactly 25 active LATAM tariffs, got ${latamTotal}`);
  }

  const laosRes = await pool.query(`
    SELECT count(*)::int as count
    FROM tariffs
    WHERE country_code = 'LA' AND is_active = true
  `);
  const laosTotal = laosRes.rows[0].count;
  console.log('1.2 Laos (LA) tariffs in DB:', laosTotal);
  if (laosTotal !== 26) {
    throw new Error(`Expected exactly 26 active Laos tariffs, got ${laosTotal}`);
  }

  // Check that no Latin America package codes exist under Laos
  const overlapCheck = await pool.query(`
    SELECT package_code, name FROM tariffs
    WHERE country_code = 'LA' AND (
      name ILIKE '%latin%' OR name ILIKE '%south america%' OR package_code IN ('PCXZ5ZM73', 'PWPT8K43N')
    )
  `);
  if (overlapCheck.rows.length > 0) {
    throw new Error(`Overlap check FAILED: Found Latin America packages under LA: ${JSON.stringify(overlapCheck.rows)}`);
  }
  console.log('1.3 Overlap check: 0 Latin America packages under Laos! PASS');

  // Check destination resolution
  const destLatam = await getDestinationBySlug('latin-america');
  if (!destLatam || destLatam.code !== 'LATAM' || destLatam.count !== 25 || !destLatam.hasUnlimited) {
    throw new Error(`getDestinationBySlug('latin-america') FAILED: ${JSON.stringify(destLatam)}`);
  }
  console.log('1.4 getDestinationBySlug("latin-america"):', destLatam.name, destLatam.code, `${destLatam.count} tariffs, hasUnlimited: ${destLatam.hasUnlimited}`);

  const destLaos = await getDestinationBySlug('laos');
  if (!destLaos || destLaos.code !== 'LA' || destLaos.count !== 26) {
    throw new Error(`getDestinationBySlug('laos') FAILED: ${JSON.stringify(destLaos)}`);
  }
  console.log('1.5 getDestinationBySlug("laos"):', destLaos.name, destLaos.code, `${destLaos.count} tariffs`);

  // ── 2. Countries Count Pluralization ───────────────────────────────────────
  console.log('\n2. Testing formatCountriesWithUnit:');
  const locales = ['de', 'en', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'tr', 'sv', 'da', 'fi', 'cs', 'ro', 'hu'];
  for (const loc of locales) {
    const c6 = formatCountriesWithUnit(6, loc);
    const c20 = formatCountriesWithUnit(20, loc);
    console.log(`  [${loc}] 6: "${c6}" | 20: "${c20}"`);
  }
  if (formatCountriesWithUnit(6, 'de') !== '6 Länder' || formatCountriesWithUnit(20, 'de') !== '20 Länder') {
    throw new Error('German countries formatting failed');
  }
  if (formatCountriesWithUnit(6, 'cs') !== '6 zemí' || formatCountriesWithUnit(20, 'cs') !== '20 zemí') {
    throw new Error('Czech countries formatting failed');
  }
  if (formatCountriesWithUnit(6, 'ro') !== '6 țări' || formatCountriesWithUnit(20, 'ro') !== '20 de țări') {
    throw new Error('Romanian countries formatting failed');
  }
  console.log('2.1 Pluralization test: PASS');

  // ── 3. Destinations Found Pluralization ───────────────────────────────────
  console.log('\n3. Testing formatDestinationsFound:');
  for (const loc of ['de', 'en', 'cs', 'pl', 'ro']) {
    console.log(`  [${loc}] 0: "${formatDestinationsFound(0, loc)}"`);
    console.log(`  [${loc}] 1: "${formatDestinationsFound(1, loc)}"`);
    console.log(`  [${loc}] 208: "${formatDestinationsFound(208, loc)}"`);
  }
  if (formatDestinationsFound(1, 'cs') !== '1 nalezená destinace' || formatDestinationsFound(0, 'cs') !== '0 nalezených destinací') {
    throw new Error('Czech destinations found failed');
  }
  if (formatDestinationsFound(1, 'ro') !== '1 destinație găsită' || formatDestinationsFound(208, 'ro') !== '208 destinații găsite' || formatDestinationsFound(20, 'ro') !== '20 de destinații găsite') {
    throw new Error('Romanian destinations found failed');
  }
  if (formatDestinationsFound(1, 'pl') !== '1 znaleziony cel podróży' || formatDestinationsFound(0, 'pl') !== '0 znalezionych celów podróży') {
    throw new Error('Polish destinations found failed');
  }
  console.log('3.1 Destinations found test: PASS');

  // ── 4. Translations completeness ──────────────────────────────────────────
  console.log('\n4. Checking translation keys across all 15 languages:');
  const requiredKeys = ['faq_teaser_desc', 'faq_teaser_unlimited_desc', 'faq_teaser_btn', 'unit_per_day', 'feat_topup_data_badge', 'feat_topup_none_badge'];
  for (const loc of locales) {
    const file = path.join('lib/i18n/translations', `${loc}.ts`);
    const content = fs.readFileSync(file, 'utf8');
    for (const key of requiredKeys) {
      if (!content.includes(`"${key}"`)) {
        throw new Error(`Missing key "${key}" in ${loc}.ts`);
      }
    }
    const aria = getPerDayAriaUnit(loc);
    if (!aria) throw new Error(`Missing getPerDayAriaUnit for ${loc}`);
  }
  console.log('4.1 All required keys present in all 15 languages: PASS');

  // ── 5. Redirect Aliases ────────────────────────────────────────────────────
  console.log('\n5. Testing Redirect Aliases:');
  const macauCode = resolveCountryOrRegionCode('macau');
  const macauSlug = countryCodeToSlug(macauCode!, 'macau');
  console.log('  macau ->', macauCode, '-> canonical slug:', macauSlug);
  if (macauCode !== 'MO' || macauSlug !== 'macao') {
    throw new Error(`Macau alias failed: got ${macauCode} -> ${macauSlug}`);
  }

  const latamCode = resolveCountryOrRegionCode('latam');
  const latamSlug = countryCodeToSlug(latamCode!, 'latam');
  console.log('  latam ->', latamCode, '-> canonical slug:', latamSlug);
  if (latamCode !== 'LATAM' || latamSlug !== 'latin-america') {
    throw new Error(`Latam alias failed: got ${latamCode} -> ${latamSlug}`);
  }

  const latinAmericaCode = resolveCountryOrRegionCode('latin_america');
  const latinAmericaSlug = countryCodeToSlug(latinAmericaCode!, 'latin_america');
  console.log('  latin_america ->', latinAmericaCode, '-> canonical slug:', latinAmericaSlug);
  if (latinAmericaCode !== 'LATAM' || latinAmericaSlug !== 'latin-america') {
    throw new Error(`latin_america alias failed: got ${latinAmericaCode} -> ${latinAmericaSlug}`);
  }

  console.log('5.1 Redirect aliases test: PASS');

  await pool.end();
  console.log('\n>>> ALL NACHFIX TESTS PASSED SUCCESSFULLY! <<<\n');
}

testAll().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
