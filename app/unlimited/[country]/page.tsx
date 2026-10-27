import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getDestinationBySlug, getCountryTariffs } from '@/lib/destinations';
import { displayCountryName } from '@/lib/tariff-display';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { formatCurrencyEuro } from '@/lib/currency';
import { getDayPassPrice, getUnlimitedPriceTable, type UnlimitedPriceTable } from '@/lib/pricing';
import { UnlimitedPageClient } from './UnlimitedPageClient';

export const revalidate = 600;

interface UnlimitedPageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: UnlimitedPageProps): Promise<Metadata> {
  const { country } = await params;
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const destination = await getDestinationBySlug(country);

  if (!destination) {
    return {
      title: { absolute: `${t('page_not_found_title' as any) || (locale === 'de' ? 'Seite nicht gefunden' : 'Page Not Found')} · PureSim` },
      robots: { index: false, follow: false },
    };
  }

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  let minPrice = 0.59;
  try {
    const tariffs = await getCountryTariffs(destination.code);
    const unlimited = tariffs.filter((t) => t.tariff_type?.startsWith('unlimited') || t.data_gb === 0);
    if (unlimited.length > 0) {
      const oneDayPrices = await Promise.all(
        unlimited.map((t) =>
          getDayPassPrice(
            {
              sale_price_eur: t.sale_price_eur,
              validity_days: t.validity_days || 1,
              discount_rule_code: t.discount_rule_code,
            },
            1
          )
        )
      );
      minPrice = Math.min(...oneDayPrices);
    }
  } catch {
    // Preserve valid meta on transient DB failure
  }
  const minPriceFormatted = formatCurrencyEuro(minPrice, locale);

  // Next.js layout template is '%s | PureSim', so title must NOT end with '| PureSim'
  const title = t('meta_unlimited_title' as any, { country: countryLabel, price: minPriceFormatted })
    || (locale === 'de'
      ? `Unlimited eSIM ${countryLabel} ab ${minPriceFormatted} konfigurieren – Highspeed Daten`
      : `Custom Unlimited eSIM ${countryLabel} from ${minPriceFormatted} – High-Speed Data`);

  const description = t('meta_unlimited_desc' as any, { country: countryLabel, price: minPriceFormatted })
    || (locale === 'de'
      ? `Unlimited eSIM für ${countryLabel} mit flexibler Laufzeit (1–365 Tage) & Highspeed-Volumen nach Wahl ab ${minPriceFormatted}. Sofortige Aktivierung per QR-Code ohne Roaming.`
      : `Customizable unlimited eSIM for ${countryLabel} with flexible validity (1–365 days) and high-speed data from ${minPriceFormatted}. Instant QR code activation.`);

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
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
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
    permanentRedirect(`${prefix}/unlimited/${destination.slug}`);
  }

  const allTariffs = await getCountryTariffs(destination.code);
  const rawUnlimitedTariffs = allTariffs.filter(
    (t) => t.tariff_type?.startsWith('unlimited') || t.data_gb === 0
  );

  if (rawUnlimitedTariffs.length === 0) {
    throw new Error(`[UnlimitedPage] Unlimited tariffs temporarily unavailable for ${destination.slug} (${destination.code})`);
  }

  // Sanitize package names so raw provider strings like "Germany 1GB/Day" are displayed cleanly as "Unlimited Eco" or "Unlimited Pro"
  const unlimitedTariffs = rawUnlimitedTariffs.map((t) => {
    const isEco = t.tariff_type === 'unlimited_eco' || (t.data_gb !== null && t.data_gb <= 1);
    const cleanName = isEco ? 'Unlimited Eco' : 'Unlimited Pro';
    return {
      ...t,
      name: cleanName,
    };
  });

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const baseUrl = BASE_URL;

  // Precompute price tables server-side (1-365 days, client-safe tiers, better deal hints)
  const priceTables: Record<string, UnlimitedPriceTable> = {};
  for (const t of unlimitedTariffs) {
    priceTables[t.package_code] = await getUnlimitedPriceTable(
      {
        sale_price_eur: t.sale_price_eur,
        validity_days: t.validity_days || 1,
        discount_rule_code: t.discount_rule_code,
      },
      1,
      365
    );
  }

  const oneDayPrices = unlimitedTariffs.map(
    (t) => priceTables[t.package_code]?.days[1]?.priceEur ?? t.sale_price_eur
  );
  const minPrice = Math.min(...oneDayPrices);
  const maxPrice = Math.max(...oneDayPrices);
  const perDayPrices = unlimitedTariffs.map(
    (t) => priceTables[t.package_code]?.frontPricePerDay ?? (t.sale_price_eur / Math.max(1, t.validity_days || 1))
  );
  const minPerDay = Math.min(...perDayPrices);

  // JSON-LD Structured Data (Product + AggregateOffer + Breadcrumbs - strictly no fake stars/ratings)
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Unlimited eSIM ${countryLabel}`,
    description: t('meta_unlimited_desc' as any, { country: countryLabel, price: formatCurrencyEuro(minPrice, locale) })
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
      offers: unlimitedTariffs.map((t) => ({
        '@type': 'Offer',
        price: (priceTables[t.package_code]?.days[1]?.priceEur ?? t.sale_price_eur).toFixed(2),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}${prefix}/unlimited/${destination.slug}`,
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
        name: 'Unlimited Builder',
        item: `${baseUrl}${prefix}/unlimited/${destination.slug}`,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: t('faq_unlimited_q1' as any, { country: countryLabel }) || 'Wie funktioniert das tägliche Highspeed-Volumen?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: t('faq_unlimited_a1' as any, { country: countryLabel }) || 'Du erhältst jeden Kalendertag dein gewähltes Highspeed-Volumen.',
        },
      },
      {
        '@type': 'Question',
        name: t('faq_unlimited_q2' as any, { country: countryLabel }) || 'Was passiert nach Verbrauch des täglichen Volumens?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: t('faq_unlimited_a2' as any, { country: countryLabel }) || 'Deine Internetverbindung bricht niemals ab.',
        },
      },
      {
        '@type': 'Question',
        name: t('faq_unlimited_q3' as any, { country: countryLabel }) || `Wie aktiviere ich die eSIM in ${countryLabel}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: t('faq_unlimited_a3' as any, { country: countryLabel }) || 'Direkt nach der Bestellung erhältst du deinen QR-Code per E-Mail und im Kundenbereich.',
        },
      },
      {
        '@type': 'Question',
        name: t('faq_unlimited_q4' as any, { country: countryLabel }) || 'Wann beginnt die Gültigkeit der gewählten Laufzeit?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: t('faq_unlimited_a4' as any, { country: countryLabel }) || 'Deine gebuchte Laufzeit beginnt erst, wenn sich die eSIM zum ersten Mal im Netz einbucht.',
        },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <UnlimitedPageClient
        destination={destination}
        tariffs={unlimitedTariffs}
        countryLabel={countryLabel}
        minPrice={minPrice}
        minPerDay={minPerDay}
        priceTables={priceTables}
      />
    </>
  );
}
