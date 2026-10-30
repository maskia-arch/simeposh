import { getRegionCode, getCountryName, detectRegion } from '../lib/esimaccess/client';
import type { EsimAccessPackage } from '../lib/esimaccess/types';

function runTests() {
  console.log('=== Test: Latin America Sync Simulation & Separation from Laos ===\n');

  // Test 1: Supplier returns package with single locationCode 'LA' but locationName 'Latin America'
  const mockLatamPkg1: EsimAccessPackage = {
    packageCode: 'TEST_LATAM_1',
    name: 'Latin America 1GB/Day',
    locationCode: 'LA',
    locationName: 'Latin America',
    price: 500,
    duration: 1,
    volume: 1073741824,
    speed: '4G',
    locationNetworkList: [],
  };

  const code1 = getRegionCode(['LA'], mockLatamPkg1);
  const name1 = getCountryName(mockLatamPkg1);
  console.log('Test 1 (locationCode "LA", locationName "Latin America"):');
  console.log('  Assigned code:', code1, '(Expected: LATAM)');
  console.log('  Assigned name:', name1, '(Expected: Latin America)');
  if (code1 !== 'LATAM' || name1 !== 'Latin America') {
    throw new Error(`Test 1 FAILED: Expected LATAM / Latin America, got ${code1} / ${name1}`);
  }

  // Test 2: Supplier returns package with multi-country array (6 South American countries)
  const mockLatamPkg2: EsimAccessPackage = {
    packageCode: 'TEST_LATAM_2',
    name: 'South America (6 areas) 10GB/Day',
    locationCodes: ['BR', 'AR', 'UY', 'PE', 'CL', 'EC'],
    locationName: 'South America (6 areas)',
    price: 3000,
    duration: 1,
    volume: 10737418240,
    speed: '4G',
    locationNetworkList: [],
  };

  const code2 = getRegionCode(mockLatamPkg2.locationCodes!, mockLatamPkg2);
  const name2 = getCountryName(mockLatamPkg2);
  console.log('\nTest 2 (Multi-country Latin America [BR, AR, UY, PE, CL, EC]):');
  console.log('  Assigned code:', code2, '(Expected: LATAM)');
  console.log('  Assigned name:', name2, '(Expected: Latin America)');
  if (code2 !== 'LATAM' || name2 !== 'Latin America') {
    throw new Error(`Test 2 FAILED: Expected LATAM / Latin America, got ${code2} / ${name2}`);
  }

  // Test 3: Supplier returns package with 20 Latin American countries
  const mockLatamPkg3: EsimAccessPackage = {
    packageCode: 'TEST_LATAM_3',
    name: 'South America 10GB 30Days',
    locationCodes: ['PR', 'SV', 'MQ', 'UY', 'HN', 'CL', 'PY', 'GP', 'BL', 'CO', 'BO', 'GT', 'CR', 'BR', 'AR', 'PA', 'PE', 'MF', 'NI', 'EC'],
    locationName: 'South America',
    price: 2500,
    duration: 30,
    volume: 10737418240,
    speed: '4G',
    locationNetworkList: [],
  };

  const code3 = getRegionCode(mockLatamPkg3.locationCodes!, mockLatamPkg3);
  const name3 = getCountryName(mockLatamPkg3);
  console.log('\nTest 3 (20 Latin American countries):');
  console.log('  Assigned code:', code3, '(Expected: LATAM)');
  console.log('  Assigned name:', name3, '(Expected: Latin America)');
  if (code3 !== 'LATAM' || name3 !== 'Latin America') {
    throw new Error(`Test 3 FAILED: Expected LATAM / Latin America, got ${code3} / ${name3}`);
  }

  // Test 4: Real Laos package (single country LA)
  const mockLaosPkg: EsimAccessPackage = {
    packageCode: 'TEST_LAOS_1',
    name: 'Laos 5GB 30Days',
    locationCode: 'LA',
    locationName: 'Laos',
    price: 800,
    duration: 30,
    volume: 5368709120,
    speed: '4G',
    locationNetworkList: [],
  };

  const codeLaos = getRegionCode(['LA'], mockLaosPkg);
  const nameLaos = getCountryName(mockLaosPkg);
  console.log('\nTest 4 (Real Laos package locationCode "LA", locationName "Laos"):');
  console.log('  Assigned code:', codeLaos, '(Expected: LA)');
  console.log('  Assigned name:', nameLaos, '(Expected: Laos)');
  if (codeLaos !== 'LA' || nameLaos !== 'Laos') {
    throw new Error(`Test 4 FAILED: Expected LA / Laos, got ${codeLaos} / ${nameLaos}`);
  }

  // Test 5: Collision verification: Laos and Latin America never share code
  console.log('\nTest 5 (Collision check):');
  console.log('  Laos code !== Latin America code:', codeLaos !== code1);
  if (codeLaos === code1) {
    throw new Error(`Test 5 FAILED: Collision between Laos and Latin America (${codeLaos})`);
  }

  console.log('\n>>> ALL 5 SYNC SIMULATION TESTS PASSED SUCCESSFULLY! <<<\n');
}

runTests();
