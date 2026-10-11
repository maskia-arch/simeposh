import fs from 'fs';
import path from 'path';

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  for (const m of content.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_]+)['"]/g)) {
    keys.add(m[1]);
  }
  for (const m of content.matchAll(/(?:badgeKey|titleKey|descKey|labelKey|priceNoteKey):\s*['"]([a-zA-Z0-9_]+)['"]/g)) {
    keys.add(m[1]);
  }
  return keys;
}

const commonFiles = [
  'components/Navbar.tsx',
  'components/Footer.tsx',
  'components/CartDrawer.tsx',
  'components/LanguageSwitcher.tsx',
  'components/CurrencySwitcher.tsx',
  'components/SkipLink.tsx',
  'components/ChatWidgetLoader.tsx'
];

const commonKeys = new Set();
for (const f of commonFiles) {
  for (const k of scanFile(f)) commonKeys.add(k);
}
// Add essential fallback keys
commonKeys.add('btn_close');
commonKeys.add('unit_per_day');

const routes = {
  home: ['app/page.tsx', 'components/HomePageClient.tsx', 'components/HeroSearch.tsx', 'components/HeaderSearch.tsx'],
  country: ['app/esim/[country]/page.tsx', 'app/esim/[country]/CountryPageClient.tsx', 'components/TariffCard.tsx', 'components/TariffDetailModal.tsx', 'lib/tariff-display.ts'],
  unlimited: ['app/unlimited/[country]/page.tsx', 'app/unlimited/[country]/UnlimitedPageClient.tsx', 'components/UnlimitedConfigurator.tsx', 'components/TariffCard.tsx', 'components/TariffDetailModal.tsx', 'lib/tariff-display.ts'],
  tariffs: ['app/tariffs/page.tsx', 'components/TariffCard.tsx', 'components/TariffDetailModal.tsx', 'lib/tariff-display.ts'],
  topup: ['app/topup/page.tsx', 'components/UnlimitedConfigurator.tsx'],
  login: ['app/login/page.tsx'],
  register: ['app/register/page.tsx'],
  cart: ['app/cart/page.tsx', 'app/order/page.tsx', 'components/CartDrawer.tsx'],
  checkout: ['app/checkout/crypto/[id]/page.tsx', 'components/CryptoCheckout.tsx'],
  blog: ['app/blog/page.tsx', 'app/blog/[slug]/page.tsx'],
  notfound: ['app/not-found.tsx', 'app/[...catchall]/page.tsx'],
};

const slices = {};
for (const [name, files] of Object.entries(routes)) {
  const set = new Set(commonKeys);
  for (const f of files) {
    for (const k of scanFile(f)) set.add(k);
  }
  slices[name] = Array.from(set).sort();
}

const sortedCommon = Array.from(commonKeys).sort();

const code = `// Auto-generated route-specific translation key sets to dramatically reduce RSC flight payload weight
export const COMMON_KEYS = new Set<string>(${JSON.stringify(sortedCommon, null, 2)});

export const ROUTE_KEY_SLICES: Record<string, Set<string>> = {
${Object.entries(slices)
  .map(([name, arr]) => `  ${name}: new Set(${JSON.stringify(arr, null, 2)}),`)
  .join('\n')}
};

export function getRouteKeys(pathname: string): Set<string> {
  const clean = pathname.replace(/^\\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?=\\/|$)/, '') || '/';
  if (clean === '/') return ROUTE_KEY_SLICES.home;
  if (clean.startsWith('/esim/')) return ROUTE_KEY_SLICES.country;
  if (clean.startsWith('/unlimited/')) return ROUTE_KEY_SLICES.unlimited;
  if (clean.startsWith('/tariffs')) return ROUTE_KEY_SLICES.tariffs;
  if (clean.startsWith('/topup')) return ROUTE_KEY_SLICES.topup;
  if (clean.startsWith('/login')) return ROUTE_KEY_SLICES.login;
  if (clean.startsWith('/register')) return ROUTE_KEY_SLICES.register;
  if (clean.startsWith('/cart') || clean.startsWith('/order')) return ROUTE_KEY_SLICES.cart;
  if (clean.startsWith('/checkout')) return ROUTE_KEY_SLICES.checkout;
  if (clean.startsWith('/blog')) return ROUTE_KEY_SLICES.blog;
  if (clean === '/notfound' || clean === '/404') return ROUTE_KEY_SLICES.notfound;
  return ROUTE_KEY_SLICES.home;
}
`;

fs.writeFileSync('lib/i18n/route-keys.ts', code, 'utf8');
console.log('Successfully generated lib/i18n/route-keys.ts!');
