import fs from 'fs';
import path from 'path';

// Valid non-page routes that MUST exist and return 200 (not HTML error/404)
const NON_PAGE_ROUTES = [
  'app/sitemap.ts',
  'app/sitemap.xml/route.ts',
  'app/robots.ts',
  'public/llms.txt',
  'app/api/destinations/route.ts',
  'app/api/topup/packages/route.ts',
  'app/ai/page.tsx',
];

let errors = 0;
for (const file of NON_PAGE_ROUTES) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Non-page route source missing: ${file}`);
    errors++;
  }
}

// Check middleware configuration specifically to ensure it does not trap non-page routes
const middlewarePath = 'middleware.ts';
if (fs.existsSync(middlewarePath)) {
  const content = fs.readFileSync(middlewarePath, 'utf8');
  const requiredExemptions = ['/sitemap', '/robots.txt', '/llms.txt', '/api/'];
  for (const item of requiredExemptions) {
    if (!content.includes(item)) {
      console.error(`❌ middleware.ts missing exemption check for: ${item}`);
      errors++;
    }
  }
  if (!content.includes('VALID_PAGE_ROUTE_REGEX')) {
    console.error(`❌ middleware.ts missing VALID_PAGE_ROUTE_REGEX`);
    errors++;
  }
} else {
  console.error(`❌ middleware.ts does not exist!`);
  errors++;
}

if (errors > 0) {
  console.error(`❌ check-non-page-routes failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log('✅ check-non-page-routes passed: all required files and middleware exemptions exist.');
}
