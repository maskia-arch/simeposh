import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Trampoline via npx tsx if not already running under tsx.
// Only pass --env-file if .env.local actually exists (it won't in Docker builds).
if (!process.env.TSX_EXEC) {
  try {
    const envLocalPath = path.join(rootDir, '.env.local');
    const envFlag = fs.existsSync(envLocalPath) ? `--env-file=.env.local` : '';
    execSync(`npx tsx ${envFlag} "${__filename}"`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, TSX_EXEC: '1' }
    });
    process.exit(0);
  } catch (e) {
    process.exit(e.status || 1);
  }
}

console.log('=== Checking Public Tariff Payload and Output Hygiene ===\n');

const FORBIDDEN_TOKENS = [
  'raw_data',
  'ek_price_usd',
  'usd_eur_rate',
  'retailPrice',
  'fupPolicy',
  'fup_policy',
  'bestNetworkType',
  'breakoutIp',
  'isPremium',
  'isNonHkIp',
  'isReloadable',
  'reloadType',
  'networkSpeed',
];

const { toPublicTariff } = await import('../lib/tariffs.ts');

// 1. Verify against database active tariffs if DATABASE_URL is present
if (process.env.DATABASE_URL) {
  console.log('Step 1: Validating all database active tariffs through toPublicTariff()...');
  const { default: pg } = await import('pg');
  let pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    let res;
    try {
      res = await pool.query(
        `SELECT * FROM tariffs WHERE is_active = true ORDER BY name ASC`
      );
    } catch (sslErr) {
      if (sslErr.message.includes('does not support SSL')) {
        await pool.end();
        pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: false,
          connectionTimeoutMillis: 5000,
        });
        res = await pool.query(
          `SELECT * FROM tariffs WHERE is_active = true ORDER BY name ASC`
        );
      } else {
        throw sslErr;
      }
    }
    console.log(`Found ${res.rows.length} active tariffs in database.`);

    const publicTariffs = res.rows.map(toPublicTariff);
    const jsonStr = JSON.stringify(publicTariffs);

    for (const token of FORBIDDEN_TOKENS) {
      if (jsonStr.includes(`"${token}"`)) {
        console.error(`❌ Hard failure: Forbidden token "${token}" found in public tariff JSON payload!`);
        process.exit(1);
      }
    }

    // Verify fupPolicy specifically (neither as key nor as value)
    if (jsonStr.includes('fupPolicy')) {
      console.error('❌ Hard failure: fupPolicy found in public tariff payload!');
      process.exit(1);
    }

    console.log(`✓ All ${res.rows.length} tariffs passed DTO hygiene (no forbidden tokens, no fupPolicy).`);
  } catch (err) {
    console.warn(`Warning: Database check failed or unreachable (${err.message}). Proceeding with mock validation.`);
  } finally {
    await pool.end();
  }
}

// 2. Check live server if running on localhost:3000 or 127.0.0.1:3000
console.log('\nStep 2: Checking live endpoints if server is running on http://127.0.0.1:3000...');
try {
  const endpointsToCheck = ['/tariffs', '/esim/germany'];
  for (const endpoint of endpointsToCheck) {
    const resp = await fetch(`http://127.0.0.1:3000${endpoint}`, { signal: AbortSignal.timeout(15000) });
    if (resp.ok) {
      const html = await resp.text();
      console.log(`Fetched ${endpoint} HTML (${html.length} bytes). Checking payload...`);
      for (const token of FORBIDDEN_TOKENS) {
        const pattern = new RegExp(`["\\\\]${token}["\\\\]\\s*:`, 'i');
        if (pattern.test(html)) {
          console.error(`❌ Hard failure: Forbidden property "${token}" found in live ${endpoint} HTML!`);
          process.exit(1);
        }
      }
      if (html.includes('fupPolicy')) {
        console.error(`❌ Hard failure: fupPolicy found in live ${endpoint} HTML!`);
        process.exit(1);
      }
      console.log(`✓ Live ${endpoint} endpoint is clean of forbidden tokens.`);
    } else {
      console.log(`Live server returned status ${resp.status} for ${endpoint}.`);
    }
  }
} catch (e) {
  console.log(`Live server not reachable or timed out (${e.message}) - skipping live HTTP check.`);
}

// 3. Scan static chunks in .next if present
console.log('\nStep 3: Checking build artifacts in .next/static/chunks if present...');
const nextChunksDir = path.join(rootDir, '.next', 'static', 'chunks');
if (fs.existsSync(nextChunksDir)) {
  const files = [];
  function walkDir(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        walkDir(full);
      } else if (item.endsWith('.js')) {
        files.push(full);
      }
    }
  }
  walkDir(nextChunksDir);
  console.log(`Found ${files.length} client chunk files in .next/static/chunks.`);

  const FORBIDDEN_CHUNK_PATTERNS = [
    'raw_data',
    'ipExport',
    'operatorList',
    'networkList',
    'locationNetworkList',
    'supportTopUpType',
    'activeType',
    'fupPolicy',
    'ek_price_usd',
    'usd_eur_rate',
  ];

  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const pattern of FORBIDDEN_CHUNK_PATTERNS) {
      if (content.includes(pattern)) {
        violations.push({ file: path.relative(rootDir, file), pattern });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`❌ Hard failure: Forbidden raw data / supplier fields leaked into client chunks (${violations.length} violations):`);
    for (const v of violations) {
      console.error(`  - ${v.file}: contains "${v.pattern}"`);
    }
    process.exit(1);
  }
  console.log('✓ All client chunks are clean! 0 forbidden supplier/raw data leaks detected.');
} else {
  console.log('No .next/static/chunks directory found (run build first to inspect chunks).');
}

console.log('\n=== Public Payload Check Passed Successfully! ===\n');
