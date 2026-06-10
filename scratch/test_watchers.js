const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

// ── Copy helper decoders from watcher.ts to verify them ─────────────────────
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP = {};
for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET[i]] = i;
}

function base58ToHex(address) {
  if (address.length === 0) return '';
  let bytes = [0];
  for (let i = 0; i < address.length; i++) {
    const c = address[i];
    if (!(c in ALPHABET_MAP)) throw new Error(`Non-base58 character: ${c}`);
    let carry = ALPHABET_MAP[c];
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let k = 0; address[k] === '1' && k < address.length - 1; k++) {
    bytes.push(0);
  }
  const decoded = new Uint8Array(bytes.reverse());
  const addressBytes = decoded.slice(0, 21);
  return Array.from(addressBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function tonAddressToRaw(addressStr) {
  if (addressStr.includes(':')) return addressStr;
  let base64 = addressStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length !== 36) {
    throw new Error('Invalid TON address length');
  }
  const workchain = bytes[1] === 0xff ? -1 : bytes[1];
  const hex = Buffer.from(bytes.slice(2, 34)).toString('hex').toUpperCase();
  return `${workchain}:${hex}`;
}

async function testDecoders() {
  console.log('--- Testing Decoders ---');
  
  // Test Tron address decoding
  const base58Tron = 'TYGs79M3rgSWhgXG7G4GqE6H32U8uX3Y4z';
  const hexTron = base58ToHex(base58Tron);
  console.log('Tron Base58:', base58Tron);
  console.log('Tron Hex:', hexTron);
  if (hexTron === '41f4a9a5a0bc8a65424565d599437ffd2cca19af82') {
    console.log('✓ Tron address decoding matches expected hex');
  } else {
    console.error('✕ Tron address decoding MISMATCH');
  }

  // Test TON address decoding
  const userFriendlyTon = 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2';
  const rawTon = tonAddressToRaw(userFriendlyTon);
  console.log('TON User-friendly:', userFriendlyTon);
  console.log('TON Raw:', rawTon);
  if (rawTon === '0:ED1691307050047117B998B561D8DE82D31FBF84910CED6EB5FC92E7485EF8A7') {
    console.log('✓ TON address decoding matches expected raw format');
  } else {
    console.error('✕ TON address decoding MISMATCH');
  }
}

async function testRates() {
  console.log('\n--- Testing Coin Rates Fetching ---');
  const { getCoinEurRate } = require('../lib/crypto/rates');
  
  const coins = ['tether', 'usd-coin', 'the-open-network', 'tron'];
  for (const c of coins) {
    try {
      const rate = await getCoinEurRate(c);
      console.log(`Rate for ${c}: ${rate} EUR`);
    } catch (err) {
      console.error(`Failed to fetch rate for ${c}:`, err.message);
    }
  }
}

async function run() {
  await testDecoders();
  await testRates();
}

run();
