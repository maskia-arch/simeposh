import fs from 'fs';
import path from 'path';

const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'tr', 'sv', 'da', 'fi', 'cs', 'ro', 'hu'];

// Collect all keys used across Client Components and code
const CLIENT_ROOTS = ['components', 'app'];
const IGNORE_DIRS = ['node_modules', '.next', '.git'];

const keysFound = new Set();

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
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

// 1. Verify all 15 translation files
let errors = 0;
const deContent = fs.readFileSync('lib/i18n/translations/de.ts', 'utf8');
const deKeys = new Set([...deContent.matchAll(/^\s*"([a-zA-Z0-9_]+)":/gm)].map(m => m[1]));

console.log(`Checking ${LOCALES.length} translation files against ${deKeys.size} canonical keys...`);

for (const loc of LOCALES) {
  const filePath = `lib/i18n/translations/${loc}.ts`;
  const content = fs.readFileSync(filePath, 'utf8');
  const locKeys = new Set([...content.matchAll(/^\s*"([a-zA-Z0-9_]+)":/gm)].map(m => m[1]));

  const missingFromLoc = [...deKeys].filter(k => !locKeys.has(k));
  if (missingFromLoc.length > 0) {
    console.error(`❌ ${loc}.ts is missing ${missingFromLoc.length} keys:`, missingFromLoc.slice(0, 10));
    errors++;
  }

  // Check for empty string values: "key": ""
  const emptyMatches = [...content.matchAll(/^\s*"([a-zA-Z0-9_]+)":\s*""/gm)];
  if (emptyMatches.length > 0) {
    console.error(`❌ ${loc}.ts has ${emptyMatches.length} empty values:`, emptyMatches.map(m => m[1]).slice(0, 10));
    errors++;
  }
}

// 2. Verify all keys found in components are in translation dictionary
const missingInDict = [...keysFound].filter(k => !deKeys.has(k));
if (missingInDict.length > 0) {
  console.error(`❌ ${missingInDict.length} keys used in UI are missing from translations:`, missingInDict);
  errors++;
} else {
  console.log(`✓ All ${keysFound.size} keys used in UI are present in all translation dictionaries.`);
}

if (errors > 0) {
  console.error(`❌ Total translation check errors: ${errors}`);
  process.exit(1);
} else {
  console.log(`✓ All 15 translation files are complete with ${deKeys.size} keys!`);
}
