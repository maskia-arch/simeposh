import fs from 'fs';
import path from 'path';

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

// Read client-keys.ts
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
