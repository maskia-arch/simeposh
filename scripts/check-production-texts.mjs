import http from 'node:http';
import https from 'node:https';

const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'tr', 'sv', 'da', 'fi', 'cs', 'ro', 'hu'];
const BASE_URL = process.env.BASE_URL || 'https://puresim.net';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function checkHtmlHygiene(url, html) {
  const issues = [];

  // Check 1: Empty title or raw title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push('Empty <title>');
  }

  // Check 2: Empty H1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && !h1Match[1].replace(/<[^>]+>/g, '').trim()) {
    issues.push('Empty <h1> tag content');
  }

  // Check 3: Raw dictionary key leak patterns (e.g., "badge_eco", "lbl_", "btn_")
  const rawKeyMatches = html.match(/\b(badge_[a-z0-9_]+|btn_[a-z0-9_]+|lbl_[a-z0-9_]+|nav_[a-z0-9_]+)\b/g);
  if (rawKeyMatches) {
    // filter false positives if any, but in production HTML no raw keys should appear
    const uniqueKeys = Array.from(new Set(rawKeyMatches));
    issues.push(`Raw translation keys detected: ${uniqueKeys.join(', ')}`);
  }

  // Check 4: Unlabeled buttons
  const emptyBtnMatches = html.match(/<button[^>]*>\s*<\/button>/gi);
  if (emptyBtnMatches) {
    issues.push(`Found empty <button></button> without text or aria-label`);
  }

  return issues;
}

async function main() {
  console.log(`=== Validating Production Texts across 15 languages on ${BASE_URL} ===\n`);

  const testPaths = [
    '',
    '/tariffs',
    '/esim/germany',
    '/unlimited/germany',
    '/topup',
    '/login',
    '/register',
    '/reviews'
  ];

  let totalChecks = 0;
  let failures = 0;

  for (const locale of LOCALES) {
    const prefix = locale === 'de' ? '' : `/${locale}`;
    for (const path of testPaths) {
      const fullUrl = `${BASE_URL}${prefix}${path}`;
      totalChecks++;
      try {
        const res = await fetchUrl(fullUrl);
        if (res.status !== 200) {
          console.error(`❌ [${res.status}] ${fullUrl}`);
          failures++;
          continue;
        }

        const issues = checkHtmlHygiene(fullUrl, res.body);
        if (issues.length > 0) {
          console.error(`❌ Issues on ${fullUrl}:`);
          for (const iss of issues) console.error(`   - ${iss}`);
          failures++;
        } else {
          // Success
          process.stdout.write(`✓ [${locale}] ${path || '/'} passed (${res.body.length} B)\n`);
        }
      } catch (err) {
        console.error(`❌ Error fetching ${fullUrl}: ${err.message}`);
        failures++;
      }
    }
  }

  console.log(`\n=== Production Text Check Complete ===`);
  console.log(`Total endpoints tested: ${totalChecks}`);
  console.log(`Failures: ${failures}`);

  if (failures > 0) {
    process.exit(1);
  } else {
    console.log(`✓ All 15 languages verified clean with no empty tags, no missing titles, and 0 raw keys!`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
