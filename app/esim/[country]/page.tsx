import { CountryPageClient } from './CountryPageClient';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDestinationBySlug, getCountryTariffs } from '@/lib/destinations';
import { displayCountryName } from '@/lib/tariff-display';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { formatCurrencyEuro } from '@/lib/currency';

export const revalidate = 600;

interface CountryPageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { country } = await params;
  const destination = await getDestinationBySlug(country);
  if (!destination) {
    return {
      title: { absolute: '404 – Page Not Found | PureSim' },
      robots: { index: false, follow: false },
    };
  }

  const locale = await getServerLocale();
  const t = getServerT(locale);

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const tariffs = await getCountryTariffs(destination.code);
  const minPrice = tariffs.length > 0
    ? Math.min(...tariffs.map((t) => t.sale_price_eur))
    : destination.minPrice;

  const minPriceFormatted = formatCurrencyEuro(minPrice, locale);
  const baseUrl = BASE_URL;

  const title = t('meta_country_title' as any, { country: countryLabel, price: minPriceFormatted })
    || (locale === 'de'
      ? `eSIM ${countryLabel} ab ${minPriceFormatted} – Highspeed Daten ohne Roaming`
      : `eSIM ${countryLabel} from ${minPriceFormatted} – High-Speed Prepaid Data`);

  const description = t('meta_country_desc' as any, { country: countryLabel, price: minPriceFormatted })
    || (locale === 'de'
      ? `Günstige Prepaid eSIM für ${countryLabel}. Highspeed-Daten ab ${minPriceFormatted}, sofortige Aktivierung per QR-Code und keine Roaming-Gebühren. Jetzt Tarif buchen!`
      : `Affordable prepaid eSIM for ${countryLabel}. High-speed data from ${minPriceFormatted}, instant QR code activation, and no roaming fees. Buy now!`);

  const prefix = locale === 'de' ? '' : `/${locale}`;

  return {
    title,
    description,
    keywords: [
      'eSIM',
      countryLabel,
      `${countryLabel} eSIM`,
      `eSIM ${countryLabel}`,
      'PureSim',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
      url: `${baseUrl}${prefix}/esim/${destination.slug}`,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: `PureSim eSIM ${countryLabel}`,
        },
      ],
    },
    alternates: buildAlternates(locale, {
      dePath: `esim/${destination.slug}`,
      enPath: `esim/${destination.slug}`,
    }),
  };
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { country } = await params;
  const destination = await getDestinationBySlug(country);

  if (!destination) {
    notFound();
  }

  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  // Canonical redirect if requested via alias or alternate code (e.g. /esim/de -> /esim/germany)
  if (country.toLowerCase() !== destination.slug) {
    redirect(`${prefix}/esim/${destination.slug}`);
  }

  const tariffs = await getCountryTariffs(destination.code);
  if (tariffs.length === 0) {
    notFound();
  }

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const baseUrl = BASE_URL;
  const minPrice = Math.min(...tariffs.map((t) => t.sale_price_eur));
  const maxPrice = Math.max(...tariffs.map((t) => t.sale_price_eur));

  // JSON-LD Structured Data (Product + AggregateOffer + Breadcrumbs)
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `eSIM ${countryLabel}`,
    description: t('meta_country_desc' as any, { country: countryLabel, price: Number(minPrice).toFixed(2) })
      || `Prepaid eSIM ${countryLabel}`,
    image: `${baseUrl}/logo.png`,
    brand: {
      '@type': 'Brand',
      name: 'PureSim',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: minPrice.toFixed(2),
      highPrice: maxPrice.toFixed(2),
      offerCount: tariffs.length,
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}${prefix}/esim/${destination.slug}`,
    },
  };

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('nav_home' as any) || 'Home',
        item: `${baseUrl}${prefix || '/'}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t('nav_tariffs') || 'eSIM',
        item: `${baseUrl}${prefix}/tariffs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: countryLabel,
        item: `${baseUrl}${prefix}/esim/${destination.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <CountryPageClient
        destination={destination}
        tariffs={tariffs}
        countryLabel={countryLabel}
      />
    </>
  );
}
