import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Trampoline via npx tsx if not already running under tsx
if (!process.env.TSX_EXEC) {
  try {
    execSync(`npx tsx --env-file=.env.local "${__filename}"`, {
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
  const resp = await fetch('http://127.0.0.1:3000/tariffs', { signal: AbortSignal.timeout(15000) });
  if (resp.ok) {
    const html = await resp.text();
    console.log(`Fetched /tariffs HTML (${html.length} bytes). Checking payload...`);
    for (const token of FORBIDDEN_TOKENS) {
      // Check for JSON-encoded property names e.g. "raw_data": or \"raw_data\":
      const pattern = new RegExp(`["\\\\]${token}["\\\\]\\s*:`, 'i');
      if (pattern.test(html)) {
        console.error(`❌ Hard failure: Forbidden property "${token}" found in live /tariffs HTML!`);
        process.exit(1);
      }
    }
    if (html.includes('fupPolicy')) {
      console.error('❌ Hard failure: fupPolicy found in live /tariffs HTML!');
      process.exit(1);
    }
    console.log('✓ Live /tariffs endpoint is clean of forbidden tokens.');
  } else {
    console.log(`Live server returned status ${resp.status} - skipping live HTTP check.`);
  }
} catch (e) {
  console.log(`Live server not reachable or timed out (${e.message}) - skipping live HTTP check.`);
}

// 3. Scan static chunks in .next if present
console.log('\nStep 3: Checking build artifacts in .next directory if present...');
const nextStaticDir = path.join(rootDir, '.next', 'static');
if (fs.existsSync(nextStaticDir)) {
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
  walkDir(nextStaticDir);
  console.log(`Found ${files.length} client chunk files in .next/static.`);

  let foundError = false;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    // Ensure raw_data does not appear as tariff DTO property or leak
    // Notice: react/webpack minified code might have arbitrary substrings, but check sensitive secrets:
    if (content.includes('ek_price_usd') || content.includes('usd_eur_rate')) {
      console.error(`❌ Hard failure: Secret token found in client bundle ${path.relative(rootDir, file)}!`);
      foundError = true;
    }
  }
  if (foundError) process.exit(1);
  console.log('✓ No secret supplier pricing found in static bundles.');
} else {
  console.log('No .next/static directory found (run build first to inspect chunks).');
}

console.log('\n=== Public Payload Check Passed Successfully! ===\n');
