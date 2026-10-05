import { CountryPageClient } from './CountryPageClient';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDestinationBySlug, getCountryTariffs } from '@/lib/destinations';
import { displayCountryName } from '@/lib/tariff-display';
import { getServerLocale } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL } from '@/lib/seo';

export const revalidate = 600;

interface CountryPageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { country } = await params;
  const destination = await getDestinationBySlug(country);
  if (!destination) {
    notFound();
  }

  const locale = await getServerLocale();
  const isDe = locale === 'de';

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const tariffs = await getCountryTariffs(destination.code);
  const minPrice = tariffs.length > 0
    ? Math.min(...tariffs.map((t) => t.sale_price_eur))
    : destination.minPrice;

  const minPriceFormatted = minPrice.toFixed(2).replace('.', ',');
  const baseUrl = BASE_URL;

  const title = isDe
    ? `eSIM ${countryLabel} ab ${minPriceFormatted} € – Highspeed Daten ohne Roaming | PureSim`
    : `eSIM ${countryLabel} from €${minPrice.toFixed(2)} – High-Speed Prepaid Data | PureSim`;

  const description = isDe
    ? `Günstige Prepaid eSIM für ${countryLabel}. Highspeed-Daten ab ${minPriceFormatted} €, sofortige Aktivierung per QR-Code und keine Roaming-Gebühren. Jetzt Tarif buchen!`
    : `Affordable prepaid eSIM for ${countryLabel}. High-speed data from €${minPrice.toFixed(2)}, instant QR code activation, and no roaming fees. Buy now!`;

  return {
    title,
    description,
    keywords: [
      'eSIM',
      countryLabel,
      `${countryLabel} eSIM`,
      `eSIM ${countryLabel} kaufen`,
      'PureSim',
      'Prepaid Daten',
      'Roaming',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}${isDe ? '' : '/en'}/esim/${destination.slug}`,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: `PureSim eSIM ${countryLabel}`,
        },
      ],
    },
    alternates: buildAlternates(isDe ? 'de' : 'en', {
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
  const isDe = locale === 'de';
  const prefix = isDe ? '' : '/en';

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
    description: isDe
      ? `Prepaid eSIM Datenpakete für ${countryLabel}. Sofort-Aktivierung per QR-Code.`
      : `Prepaid eSIM data plans for ${countryLabel}. Instant QR code activation.`,
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
      offers: tariffs.map((t) => ({
        '@type': 'Offer',
        name: t.name,
        price: Number(t.sale_price_eur).toFixed(2),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/tariffs/${t.slug}`,
      })),
    },
  };

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: isDe ? 'Startseite' : 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: isDe ? 'eSIM Tarife' : 'eSIM Plans',
        item: `${baseUrl}/tariffs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: countryLabel,
        item: `${baseUrl}/esim/${destination.slug}`,
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
