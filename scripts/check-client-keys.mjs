import fs from 'fs';
import path from 'path';

// Parse ROUTE_KEY_SLICES and COMMON_KEYS from lib/i18n/route-keys.ts without TypeScript loader
const routeKeysCode = fs.readFileSync('lib/i18n/route-keys.ts', 'utf8');

function extractSet(name) {
  const match = routeKeysCode.match(new RegExp(`${name}:\\s*new Set\\((\\[[\\s\\S]*?\\])\\)`));
  if (!match) return new Set();
  try {
    return new Set(JSON.parse(match[1]));
  } catch {
    return new Set();
  }
}

const ROUTE_KEY_SLICES = {
  home: extractSet('home'),
  country: extractSet('country'),
  unlimited: extractSet('unlimited'),
  tariffs: extractSet('tariffs'),
  cart: extractSet('cart'),
  checkout: extractSet('checkout'),
  blog: extractSet('blog'),
  notfound: extractSet('notfound'),
};

// Collect all keys used by Client Components ('use client' files or files imported by them)
const CLIENT_ROOTS = ['components', 'app'];
const IGNORE_DIRS = ['node_modules', '.next', '.git'];

const keysFound = new Set();

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match t('key') and t("key")
  const matches = content.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_]+)['"]/g);
  for (const m of matches) {
    keysFound.add(m[1]);
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        scanDir(fullPath);
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      // Check if it's a client file or component
      const content = fs.readFileSync(fullPath, 'utf8');
      if (
        fullPath.includes('components') ||
        content.includes("'use client'") ||
        content.includes('"use client"') ||
        fullPath.includes('Client')
      ) {
        scanFile(fullPath);
      }
    }
  }
}

for (const d of CLIENT_ROOTS) {
  if (fs.existsSync(d)) scanDir(d);
}

// Also include dynamic keys from lib/tariff-display.ts
const tariffDisplayPath = path.join('lib', 'tariff-display.ts');
if (fs.existsSync(tariffDisplayPath)) {
  const content = fs.readFileSync(tariffDisplayPath, 'utf8');
  const matches = content.matchAll(/(?:badgeKey|titleKey|descKey|labelKey|priceNoteKey):\s*['"]([a-zA-Z0-9_]+)['"]/g);
  for (const m of matches) {
    keysFound.add(m[1]);
  }
}

// 1. Verify that all keys found across the app exist in client-keys.ts
const clientKeysPath = path.join('lib', 'i18n', 'client-keys.ts');
const clientKeysContent = fs.readFileSync(clientKeysPath, 'utf8');

const missing = [];
for (const k of keysFound) {
  if (!clientKeysContent.includes(`"${k}"`)) {
    missing.push(k);
  }
}

if (missing.length > 0) {
  console.error(`❌ Build check failed: ${missing.length} client translation keys are missing from client-keys.ts:`);
  console.error(missing);
  process.exit(1);
} else {
  console.log(`✓ All ${keysFound.size} client translation keys are present in client-keys.ts.`);
}

// 2. Verify route-specific dictionary slices
const routeChecks = [
  { name: 'home', files: ['components/HomePageClient.tsx', 'components/HeroSearch.tsx'] },
  { name: 'country', files: ['app/esim/[country]/CountryPageClient.tsx', 'components/TariffCard.tsx', 'components/TariffDetailModal.tsx'] },
  { name: 'unlimited', files: ['app/unlimited/[country]/UnlimitedPageClient.tsx', 'components/UnlimitedConfigurator.tsx', 'components/TariffCard.tsx'] },
];

let routeErrors = 0;
for (const rc of routeChecks) {
  const slice = ROUTE_KEY_SLICES[rc.name];
  if (!slice || slice.size === 0) {
    console.error(`❌ Missing or empty route key slice for ${rc.name}`);
    routeErrors++;
    continue;
  }
  const routeKeys = new Set();
  for (const f of rc.files) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf8');
      const matches = content.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_]+)['"]/g);
      for (const m of matches) routeKeys.add(m[1]);
    }
  }
  const missingInRoute = [];
  for (const k of routeKeys) {
    if (!slice.has(k)) {
      missingInRoute.push(k);
    }
  }
  if (missingInRoute.length > 0) {
    console.error(`❌ Route slice "${rc.name}" is missing ${missingInRoute.length} keys:`, missingInRoute);
    routeErrors++;
  } else {
    console.log(`✓ Route slice "${rc.name}" contains all ${routeKeys.size} component keys.`);
  }
}

if (routeErrors > 0) {
  process.exit(1);
}
