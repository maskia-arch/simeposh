import type { Metadata } from 'next';
import { getAllDestinations } from '@/lib/destinations';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { isoName, regionLabel, isRegionCode } from '@/lib/tariff-display';
import { DestinationsOverviewClient, type OverviewDestination } from '@/components/DestinationsOverviewClient';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const isDe = locale === 'de';

  const title = t('meta_esim_overview_title' as any) || (isDe
    ? 'eSIM Länder & Regionen im Überblick | PureSim'
    : 'eSIM Destinations & Countries Overview | PureSim');

  const description = t('meta_esim_overview_desc' as any) || (isDe
    ? 'Entdecke günstige eSIM-Tarife für über 200 Länder und Regionen weltweit. Schnelles Daten-Roaming ohne Vertrag und ohne Roaming-Gebühren – ab 0,59 €.'
    : 'Discover affordable eSIM plans for over 200 countries and regions worldwide. Fast data roaming without contracts or extra roaming fees – starting from €0.59.');

  return {
    title,
    description,
    alternates: buildAlternates(locale, { dePath: 'esim', enPath: 'esim' }),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${BASE_URL}${isDe ? '' : `/${locale}`}/esim`,
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
    },
  };
}

// Continent / group mappings for all 208 destinations
const REGION_CODES = new Set(['EU', 'AS', 'SEA', 'ME', 'NA', 'LATAM', 'OC', 'AF', 'GLOB']);

const CONTINENT_MAP: Record<string, 'europe' | 'asia' | 'americas' | 'middle_east' | 'africa' | 'oceania' | 'global'> = {
  // Europe
  AD: 'europe', AL: 'europe', AT: 'europe', AX: 'europe', BA: 'europe', BE: 'europe', BG: 'europe',
  BY: 'europe', CH: 'europe', CY: 'europe', CZ: 'europe', DE: 'europe', DK: 'europe', EE: 'europe',
  ES: 'europe', FI: 'europe', FO: 'europe', FR: 'europe', GB: 'europe', GG: 'europe', GI: 'europe',
  GR: 'europe', HR: 'europe', HU: 'europe', IE: 'europe', IM: 'europe', IS: 'europe', IT: 'europe',
  JE: 'europe', LI: 'europe', LT: 'europe', LU: 'europe', LV: 'europe', MC: 'europe', MD: 'europe',
  ME: 'europe', MK: 'europe', MT: 'europe', NL: 'europe', NO: 'europe', PL: 'europe', PT: 'europe',
  RO: 'europe', RS: 'europe', RU: 'europe', SE: 'europe', SI: 'europe', SK: 'europe', SM: 'europe',
  UA: 'europe', VA: 'europe', XK: 'europe',

  // Asia
  AF: 'asia', AM: 'asia', AZ: 'asia', BD: 'asia', BN: 'asia', BT: 'asia', CN: 'asia', GE: 'asia',
  HK: 'asia', ID: 'asia', IN: 'asia', JP: 'asia', KG: 'asia', KH: 'asia', KR: 'asia', KZ: 'asia',
  LA: 'asia', LK: 'asia', MM: 'asia', MN: 'asia', MO: 'asia', MV: 'asia', MY: 'asia', NP: 'asia',
  PH: 'asia', PK: 'asia', SG: 'asia', TH: 'asia', TJ: 'asia', TW: 'asia', UZ: 'asia', VN: 'asia',

  // Middle East
  AE: 'middle_east', BH: 'middle_east', IL: 'middle_east', IQ: 'middle_east', JO: 'middle_east',
  KW: 'middle_east', LB: 'middle_east', OM: 'middle_east', PS: 'middle_east', QA: 'middle_east',
  SA: 'middle_east', TR: 'middle_east', YE: 'middle_east',

  // Americas
  AG: 'americas', AI: 'americas', AR: 'americas', AW: 'americas', BB: 'americas', BL: 'americas',
  BM: 'americas', BO: 'americas', BQ: 'americas', BR: 'americas', BS: 'americas', BZ: 'americas',
  CA: 'americas', CL: 'americas', CO: 'americas', CR: 'americas', CU: 'americas', CW: 'americas',
  DM: 'americas', DO: 'americas', EC: 'americas', GD: 'americas', GF: 'americas', GL: 'americas',
  GP: 'americas', GT: 'americas', GY: 'americas', HN: 'americas', HT: 'americas', JM: 'americas',
  KN: 'americas', KY: 'americas', LC: 'americas', MF: 'americas', MQ: 'americas', MS: 'americas',
  MX: 'americas', NI: 'americas', PA: 'americas', PE: 'americas', PR: 'americas', PY: 'americas',
  SR: 'americas', SV: 'americas', TC: 'americas', TT: 'americas', US: 'americas', UY: 'americas',
  VC: 'americas', VE: 'americas', VG: 'americas', VI: 'americas',

  // Africa
  AO: 'africa', BF: 'africa', BI: 'africa', BJ: 'africa', BW: 'africa', CD: 'africa', CF: 'africa',
  CG: 'africa', CI: 'africa', CM: 'africa', CV: 'africa', DJ: 'africa', DZ: 'africa', EG: 'africa',
  ET: 'africa', GA: 'africa', GH: 'africa', GM: 'africa', GN: 'africa', GQ: 'africa', GW: 'africa',
  KE: 'africa', LR: 'africa', LS: 'africa', LY: 'africa', MA: 'africa', MG: 'africa', ML: 'africa',
  MR: 'africa', MU: 'africa', MW: 'africa', MZ: 'africa', NA: 'africa', NE: 'africa', NG: 'africa',
  RE: 'africa', RW: 'africa', SC: 'africa', SD: 'africa', SL: 'africa', SN: 'africa', SO: 'africa',
  SS: 'africa', ST: 'africa', SZ: 'africa', TD: 'africa', TG: 'africa', TN: 'africa', TZ: 'africa',
  UG: 'africa', YT: 'africa', ZA: 'africa', ZM: 'africa', ZW: 'africa',

  // Oceania
  AS: 'oceania', AU: 'oceania', CK: 'oceania', FJ: 'oceania', FM: 'oceania', GU: 'oceania',
  KI: 'oceania', MH: 'oceania', MP: 'oceania', NC: 'oceania', NR: 'oceania', NU: 'oceania',
  NZ: 'oceania', PF: 'oceania', PG: 'oceania', PW: 'oceania', SB: 'oceania', TO: 'oceania',
  TV: 'oceania', VU: 'oceania', WS: 'oceania',
};

export default async function EsimPage() {
  const locale = await getServerLocale();
  const rawDestinations = await getAllDestinations();

  const destinations: OverviewDestination[] = rawDestinations.map((d) => {
    const isRegion = isRegionCode(d.code) || REGION_CODES.has(d.code);
    const localizedName = isRegion
      ? regionLabel(d.code, locale)
      : (isoName(d.code, locale) || d.name);

    let regionGroup: OverviewDestination['regionGroup'] = 'global';
    if (REGION_CODES.has(d.code)) {
      regionGroup = 'global';
    } else if (CONTINENT_MAP[d.code]) {
      regionGroup = CONTINENT_MAP[d.code];
    }

    return {
      code: d.code,
      name: d.name,
      localizedName,
      slug: d.slug,
      flag: d.flag,
      minPrice: d.minPrice || 0,
      count: d.count || 0,
      regionGroup,
    };
  });

  // Sort alphabetically by localized name within each region
  destinations.sort((a, b) => a.localizedName.localeCompare(b.localizedName, locale));

  return (
    <DestinationsOverviewClient
      destinations={destinations}
      totalDestinations={destinations.length}
    />
  );
}
