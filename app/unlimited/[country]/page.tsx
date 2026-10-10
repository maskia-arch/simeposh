import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDestinationBySlug, getCountryTariffs, getAllDestinations } from '@/lib/destinations';
import { displayCountryName } from '@/lib/tariff-display';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL } from '@/lib/seo';
import { UnlimitedPageClient } from './UnlimitedPageClient';

export const revalidate = 600;

interface UnlimitedPageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: UnlimitedPageProps): Promise<Metadata> {
  const { country } = await params;
  const destination = await getDestinationBySlug(country);
  if (!destination) {
    notFound();
  }

  const locale = await getServerLocale();
  const t = getServerT(locale);

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const tariffs = await getCountryTariffs(destination.code);
  const unlimited = tariffs.filter((t) => t.tariff_type?.startsWith('unlimited') || t.data_gb === 0);
  const minPrice = unlimited.length > 0
    ? Math.min(...unlimited.map((t) => t.sale_price_eur))
    : destination.minPrice;
  const minPriceFormatted = minPrice.toFixed(2).replace('.', ',');

  // Next.js layout template is '%s | PureSim', so title must NOT end with '| PureSim'
  const title = t('meta_unlimited_title' as any, { country: countryLabel, price: locale === 'de' ? minPriceFormatted : minPrice.toFixed(2) })
    || (locale === 'de'
      ? `Unlimited eSIM ${countryLabel} ab ${minPriceFormatted} € konfigurieren – Highspeed Daten`
      : `Custom Unlimited eSIM ${countryLabel} from €${minPrice.toFixed(2)} – High-Speed Data`);

  const description = t('meta_unlimited_desc' as any, { country: countryLabel, price: locale === 'de' ? minPriceFormatted : minPrice.toFixed(2) })
    || (locale === 'de'
      ? `Unlimited eSIM für ${countryLabel} mit flexibler Laufzeit (1–365 Tage) & Highspeed-Volumen nach Wahl ab ${minPriceFormatted} €. Sofortige Aktivierung per QR-Code ohne Roaming.`
      : `Customizable unlimited eSIM for ${countryLabel} with flexible validity (1–365 days) and high-speed data from €${minPrice.toFixed(2)}. Instant QR code activation.`);

  const baseUrl = BASE_URL;
  const prefix = locale === 'de' ? '' : `/${locale}`;

  return {
    title,
    description,
    keywords: [
      'Unlimited eSIM',
      `Unlimited eSIM ${countryLabel}`,
      countryLabel,
      'eSIM Konfigurator',
      'PureSim',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}${prefix}/unlimited/${destination.slug}`,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: `PureSim Unlimited eSIM ${countryLabel}`,
        },
      ],
    },
    alternates: buildAlternates(locale, {
      dePath: `unlimited/${destination.slug}`,
      enPath: `unlimited/${destination.slug}`,
    }),
  };
}

export default async function UnlimitedCountryPage({ params }: UnlimitedPageProps) {
  const { country } = await params;
  const destination = await getDestinationBySlug(country);

  if (!destination) {
    notFound();
  }

  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  // Canonical redirect if requested via alias or alternate code (e.g. /unlimited/de -> /unlimited/germany)
  if (country.toLowerCase() !== destination.slug) {
    redirect(`${prefix}/unlimited/${destination.slug}`);
  }

  const allTariffs = await getCountryTariffs(destination.code);
  const unlimitedTariffs = allTariffs.filter(
    (t) => t.tariff_type?.startsWith('unlimited') || t.data_gb === 0
  );

  if (unlimitedTariffs.length === 0) {
    notFound();
  }

  const allDestinations = await getAllDestinations();
  const destinationList = allDestinations.map((d) => ({
    code: d.code,
    name: d.name,
    flag: d.flag,
    slug: d.slug,
  }));

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const baseUrl = BASE_URL;
  const minPrice = Math.min(...unlimitedTariffs.map((t) => t.sale_price_eur));
  const maxPrice = Math.max(...unlimitedTariffs.map((t) => t.sale_price_eur));
  const minPerDay = Math.min(...unlimitedTariffs.map((t) => t.sale_price_eur / Math.max(1, t.validity_days || 1)));

  // JSON-LD Structured Data (Product + AggregateOffer + Breadcrumbs - strictly no fake stars/ratings)
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Unlimited eSIM ${countryLabel}`,
    description: t('meta_unlimited_desc' as any, { country: countryLabel, price: minPrice.toFixed(2) })
      || `Prepaid Unlimited eSIM ${countryLabel}`,
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
      offerCount: unlimitedTariffs.length,
      url: `${baseUrl}${prefix}/unlimited/${destination.slug}`,
      availability: 'https://schema.org/InStock',
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
      {
        '@type': 'ListItem',
        position: 4,
        name: `Unlimited eSIM ${countryLabel}`,
        item: `${baseUrl}${prefix}/unlimited/${destination.slug}`,
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
      <UnlimitedPageClient
        destination={destination}
        tariffs={unlimitedTariffs}
        countryLabel={countryLabel}
        allDestinations={destinationList}
        minPrice={minPrice}
        minPerDay={minPerDay}
      />
    </>
  );
}
