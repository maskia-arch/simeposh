import fs from 'fs';
import path from 'path';

// Files to check for unescaped or unhandled raw {country} or other template literals
const FILES_TO_SCAN = [
  'app/esim/[country]/CountryPageClient.tsx',
  'app/esim/[country]/page.tsx',
  'app/unlimited/[country]/UnlimitedPageClient.tsx',
  'app/unlimited/[country]/page.tsx',
  'components/FaqSection.tsx',
];

let errors = 0;

for (const relPath of FILES_TO_SCAN) {
  if (!fs.existsSync(relPath)) continue;
  const content = fs.readFileSync(relPath, 'utf8');
  
  // Check if raw literal '{country}' is rendered in JSX text nodes directly (e.g. >...{country}...<)
  // Note: we allow { country: countryLabel } or {country} as a variable reference in JSX
  const rawJspMatches = [...content.matchAll(/>[^<]*(\{country\})[^<]*</g)];
  if (rawJspMatches.length > 0) {
    console.error(`❌ Literal '{country}' string found in JSX in ${relPath}`);
    errors++;
  }
}

// Check translation files: {country} is allowed in translation strings as a placeholder template,
// BUT check that all translation files have consistent placeholders
const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'tr', 'sv', 'da', 'fi', 'cs', 'ro', 'hu'];
const deContent = fs.readFileSync('lib/i18n/translations/de.ts', 'utf8');

// Find all keys in de.ts that contain {country}
const countryKeys = [];
for (const match of deContent.matchAll(/"([a-zA-Z0-9_]+)":\s*"([^"]*\{country\}[^"]*)"/g)) {
  countryKeys.push(match[1]);
}

for (const loc of LOCALES) {
  if (loc === 'de') continue;
  const locContent = fs.readFileSync(`lib/i18n/translations/${loc}.ts`, 'utf8');
  for (const k of countryKeys) {
    const keyMatch = locContent.match(new RegExp(`"${k}":\\s*"([^"]*)"`));
    if (keyMatch) {
      if (!keyMatch[1].includes('{country}')) {
        console.warn(`⚠️ Warning: ${loc}.ts key "${k}" does not contain {country} placeholder.`);
      }
    }
  }
}

if (errors > 0) {
  console.error(`❌ check-placeholders failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log(`✅ check-placeholders passed: no unrendered raw {country} tokens found in page templates.`);
}
