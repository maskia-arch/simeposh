import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDestinationBySlug, getCountryTariffs } from '@/lib/destinations';
import { displayCountryName } from '@/lib/tariff-display';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { formatCurrencyEuro } from '@/lib/currency';
import { getDayPassPrice, getUnlimitedPriceTable, type UnlimitedPriceTable } from '@/lib/pricing';
import { UnlimitedPageClient } from './[country]/UnlimitedPageClient';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  const title = locale === 'de'
    ? 'Unlimited eSIM konfigurieren – Highspeed Daten weltweit | PureSim'
    : 'Configure Unlimited eSIM – Worldwide High-Speed Data | PureSim';

  const description = locale === 'de'
    ? 'Flexible Unlimited eSIM für über 200 Länder mit 1–365 Tagen Laufzeit. Highspeed-Volumen nach Wahl, einfache Aktivierung per QR-Code und keine Roaming-Gebühren.'
    : 'Flexible Unlimited eSIM for 200+ countries with 1–365 days validity. High-speed data allowance of your choice, easy QR-code activation and no roaming fees.';

  const baseUrl = BASE_URL;
  const prefix = locale === 'de' ? '' : `/${locale}`;

  return {
    title,
    description,
    keywords: [
      'Unlimited eSIM',
      'Unlimited Data eSIM',
      'eSIM Konfigurator',
      'PureSim',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
      url: `${baseUrl}${prefix}/unlimited`,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: 'PureSim Unlimited eSIM',
        },
      ],
    },
    alternates: buildAlternates(locale, {
      dePath: 'unlimited',
      enPath: 'unlimited',
    }),
  };
}

export default async function UnlimitedDefaultPage() {
  const destination = await getDestinationBySlug('germany');

  if (!destination) {
    notFound();
  }

  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  const rawUnlimitedTariffs = (await getCountryTariffs(destination.code)).filter(
    (tr) => tr.tariff_type?.startsWith('unlimited') || tr.data_gb === 0
  );

  if (rawUnlimitedTariffs.length === 0) {
    notFound();
  }

  const unlimitedTariffs = rawUnlimitedTariffs.map((tr) => {
    const isEco = tr.tariff_type === 'unlimited_eco' || (tr.data_gb !== null && tr.data_gb <= 1);
    const cleanName = isEco ? 'Unlimited Eco' : 'Unlimited Pro';
    return {
      ...tr,
      name: cleanName,
    };
  });

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const priceTables: Record<string, UnlimitedPriceTable> = {};
  for (const tr of unlimitedTariffs) {
    priceTables[tr.package_code] = await getUnlimitedPriceTable(
      {
        sale_price_eur: tr.sale_price_eur,
        validity_days: tr.validity_days || 1,
        discount_rule_code: tr.discount_rule_code,
      },
      1,
      365
    );
  }

  const oneDayPrices = unlimitedTariffs.map(
    (tr) => priceTables[tr.package_code]?.days[1]?.priceEur ?? tr.sale_price_eur
  );
  const minPrice = Math.min(...oneDayPrices);
  const perDayPrices = unlimitedTariffs.map(
    (tr) => priceTables[tr.package_code]?.frontPricePerDay ?? (tr.sale_price_eur / Math.max(1, tr.validity_days || 1))
  );
  const minPerDay = Math.min(...perDayPrices);

  return (
    <UnlimitedPageClient
      destination={destination}
      tariffs={unlimitedTariffs}
      countryLabel={countryLabel}
      minPrice={minPrice}
      minPerDay={minPerDay}
      priceTables={priceTables}
      isOverview={true}
      customH1={locale === 'de' ? 'Unlimited eSIM – Land wählen und konfigurieren' : 'Unlimited eSIM – Choose Country and Configure'}
    />
  );
}
