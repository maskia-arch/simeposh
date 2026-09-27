import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (!process.env.TSX_EXEC) {
  try {
    execSync(`npx tsx "${fileURLToPath(import.meta.url)}"`, {
      stdio: 'inherit',
      env: { ...process.env, TSX_EXEC: '1' }
    });
    process.exit(0);
  } catch (e) {
    process.exit(e.status || 1);
  }
}

const { toPublicTariff } = await import('../lib/tariffs.ts');

const EXPECTED_PUBLIC_TARIFF_KEYS = [
  'id',
  'slug',
  'package_code',
  'name',
  'description',
  'country_code',
  'country_name',
  'region',
  'flag_emoji',
  'location_codes',
  'data_gb',
  'validity_days',
  'sale_price_eur',
  'tariff_type',
  'speed_kbps',
  'label',
  'is_top_up_eligible',
  'operators',
  'breakout_ip',
  'best_network_type',
  'is_premium',
  'is_non_hk_ip',
  'is_reloadable',
  'reloadability_type',
  'throttle_speed',
  'network_speed',
  'activates_on_arrival',
].sort();

console.log('--- Testing toPublicTariff DTO Whitelist ---');

const mockRawTariff = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'test-tariff',
  package_code: 'TEST_01',
  name: 'Test Tariff NonHKIP FUP1Mbps',
  description: 'Test Description',
  country_code: 'DE',
  country_name: 'Germany',
  region: 'Europe',
  flag_emoji: '🇩🇪',
  location_codes: ['DE'],
  data_gb: 5,
  validity_days: 30,
  sale_price_eur: 9.99,
  tariff_type: 'travel',
  speed_kbps: 100000,
  label: 'Bestseller',
  is_top_up_eligible: true,
  ek_price_usd: 5.50,
  usd_eur_rate: 1.08,
  raw_data: {
    activeType: 2,
    price: 5.50,
    retailPrice: 15.00,
    fupPolicy: '1 Mbps',
    speed: '4G/5G',
    ipExport: 'DE',
    operatorList: [{ operatorName: 'Telekom', networkType: '5G' }],
  },
};

const dto = toPublicTariff(mockRawTariff);
const actualKeys = Object.keys(dto).sort();

assert.deepStrictEqual(
  actualKeys,
  EXPECTED_PUBLIC_TARIFF_KEYS,
  `DTO keys mismatch!\nExpected: ${JSON.stringify(EXPECTED_PUBLIC_TARIFF_KEYS)}\nActual: ${JSON.stringify(actualKeys)}`
);
console.log('✓ Exact Whitelist Keys match (27 snake_case keys)');

// Verify no forbidden keys or camelCase duplicates
const FORBIDDEN_KEYS = [
  'raw_data', 'ek_price_usd', 'usd_eur_rate', 'retailPrice', 'packageCode',
  'breakoutIp', 'bestNetworkType', 'isPremium', 'isNonHkIp', 'isReloadable',
  'reloadType', 'fupPolicy', 'fup_policy', 'networkSpeed'
];

for (const key of FORBIDDEN_KEYS) {
  assert.strictEqual(key in dto, false, `Forbidden/deprecated key "${key}" should NOT be present in DTO`);
}
console.log('✓ No forbidden keys or camelCase duplicates present');

// Test activeType derivation for activates_on_arrival
console.log('--- Testing activates_on_arrival derivation ---');

// activeType 2 (number) -> true
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { activeType: 2 } }).activates_on_arrival, true);
// activeType "2" (string) -> true
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { activeType: '2' } }).activates_on_arrival, true);
// activeType 1 (number) -> false
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { activeType: 1 } }).activates_on_arrival, false);
// activeType "1" (string) -> false
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { activeType: '1' } }).activates_on_arrival, false);
// activeType 3 -> false
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { activeType: 3 } }).activates_on_arrival, false);
// activeType null -> false
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { activeType: null } }).activates_on_arrival, false);
// activeType undefined -> false
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: {} }).activates_on_arrival, false);
// raw_data missing -> false
assert.strictEqual(toPublicTariff({ id: '1', name: 'Test' }).activates_on_arrival, false);

console.log('✓ activates_on_arrival correctly derives activeType = 2 and rejects all others');

// Test throttle_speed sanitization
console.log('--- Testing throttle_speed ---');
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { fupPolicy: '512 Kbps' } }).throttle_speed, '512 Kbps');
assert.strictEqual(toPublicTariff({ ...mockRawTariff, raw_data: { fupPolicy: 'Resellers must ensure minimum retail price $10' } }).throttle_speed, null);
console.log('✓ throttle_speed properly keeps technical speed and sanitizes contract text');

console.log('\n--- All Tariff Mapper Unit Tests Passed! ---');
