import { buildAlternates, BASE_URL } from '@/lib/seo';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TariffDetailPageClient from './TariffDetailPageClient';
import { toPublicTariff, type PublicTariff } from '@/lib/tariffs';
import { getTariffMinCustomerPrice } from '@/lib/pricing';
import { getDestinationBySlug } from '@/lib/destinations';
import { displayCountryName, formatLocalizedTariffName } from '@/lib/tariff-display';
import { formatGb } from '@/lib/utils';
import { formatDaysWithUnit } from '@/lib/i18n/plural';
import { formatCurrencyEuro } from '@/lib/currency';

const PUBLIC_SELECT_FIELDS = 'id, package_code, slug, name, description, country_code, country_name, region, flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type, speed_kbps, label, is_top_up_eligible, active_type, support_top_up_type, discount_rule_code, raw_data';

const tariffDetailCache = new Map<string, { data: PublicTariff | null; timestamp: number }>();
const inFlightTariffPromises = new Map<string, Promise<PublicTariff | null>>();
const TARIFF_DETAIL_TTL = 10 * 60 * 1000; // 10 minutes

async function getTariff(slug: string): Promise<PublicTariff | null> {
  const normalizedSlug = slug.toLowerCase();
  const cached = tariffDetailCache.get(normalizedSlug);
  if (cached && Date.now() - cached.timestamp < TARIFF_DETAIL_TTL) {
    return cached.data;
  }

  if (inFlightTariffPromises.has(normalizedSlug)) {
    return inFlightTariffPromises.get(normalizedSlug)!;
  }

  const promise = (async () => {
    try {
      const supabase = await createClient();
      
      // 1. Try slug match
      let { data } = await supabase
        .from('tariffs')
        .select(PUBLIC_SELECT_FIELDS)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        const res = toPublicTariff(data);
        res.customer_price_eur = await getTariffMinCustomerPrice(data);
        tariffDetailCache.set(normalizedSlug, { data: res, timestamp: Date.now() });
        return res;
      }

      // 2. Try package_code match (case-insensitive fallback)
      const codeTry = slug.replace(/-/g, '_').toUpperCase();
      const { data: dataCode } = await supabase
        .from('tariffs')
        .select(PUBLIC_SELECT_FIELDS)
        .eq('package_code', codeTry)
        .eq('is_active', true)
        .maybeSingle();

      if (dataCode) {
        const res = toPublicTariff(dataCode);
        res.customer_price_eur = await getTariffMinCustomerPrice(dataCode);
        tariffDetailCache.set(normalizedSlug, { data: res, timestamp: Date.now() });
        return res;
      }

      // 3. Try original slug as package_code directly
      const { data: dataCodeDirect } = await supabase
        .from('tariffs')
        .select(PUBLIC_SELECT_FIELDS)
        .eq('package_code', slug.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      const res = dataCodeDirect ? toPublicTariff(dataCodeDirect) : null;
      if (res && dataCodeDirect) {
        res.customer_price_eur = await getTariffMinCustomerPrice(dataCodeDirect);
      }
      tariffDetailCache.set(normalizedSlug, { data: res, timestamp: Date.now() });
      return res;
    } finally {
      inFlightTariffPromises.delete(normalizedSlug);
    }
  })();

  inFlightTariffPromises.set(normalizedSlug, promise);
  return promise;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tariff = await getTariff(slug);
  if (!tariff) {
    const dest = await getDestinationBySlug(slug);
    if (dest) {
      return {
        title: `eSIM ${dest.name} | PureSim`,
      };
    }
    notFound();
  }

  const locale = await getServerLocale();
  const t = getServerT(locale);
  const isDe = locale === 'de';

  const country = displayCountryName(tariff, locale);
  let dataLabel = formatGb(tariff.data_gb);
  if (tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0) {
    const localizedFullName = formatLocalizedTariffName(tariff.name, country, tariff.country_name, locale);
    if (localizedFullName.includes(' · ')) {
      dataLabel = localizedFullName.split(' · ').slice(1).join(' · ');
    } else {
      dataLabel = 'Unlimited';
    }
  } else if (locale === 'fi') {
    dataLabel = dataLabel.replace(/\bGB\b/g, 'Gt').replace(/\bMB\b/g, 'Mt');
  }

  const daysLabel = formatDaysWithUnit(tariff.validity_days, locale);
  const priceFormatted = formatCurrencyEuro(tariff.customer_price_eur ?? tariff.sale_price_eur, locale);

  const buyPrefixMap: Record<string, string> = {
    de: `eSIM ${country} ${dataLabel} (${daysLabel}) kaufen`,
    en: `Buy eSIM ${country} ${dataLabel} (${daysLabel})`,
    fr: `Acheter eSIM ${country} ${dataLabel} (${daysLabel})`,
    es: `Comprar eSIM ${country} ${dataLabel} (${daysLabel})`,
    it: `Acquista eSIM ${country} ${dataLabel} (${daysLabel})`,
    nl: `Koop eSIM ${country} ${dataLabel} (${daysLabel})`,
    pl: `Kup eSIM ${country} ${dataLabel} (${daysLabel})`,
    pt: `Comprar eSIM ${country} ${dataLabel} (${daysLabel})`,
    tr: `eSIM Satın Al ${country} ${dataLabel} (${daysLabel})`,
    sv: `Köp eSIM ${country} ${dataLabel} (${daysLabel})`,
    da: `Køb eSIM ${country} ${dataLabel} (${daysLabel})`,
    fi: `Osta eSIM ${country} ${dataLabel} (${daysLabel})`,
    cs: `Koupit eSIM ${country} ${dataLabel} (${daysLabel})`,
    ro: `Cumpără eSIM ${country} ${dataLabel} (${daysLabel})`,
    hu: `eSIM vásárlás ${country} ${dataLabel} (${daysLabel})`,
  };

  const title = buyPrefixMap[locale] || `Buy eSIM ${country} ${dataLabel} (${daysLabel})`;

  const description = t('meta_tariff_slug_desc', {
    country,
    data: dataLabel,
    days: daysLabel,
    price: priceFormatted,
  });

  const baseUrl = BASE_URL;

  return {
    title,
    description,
    keywords: [
      'eSIM',
      country,
      `${country} eSIM`,
      'PureSim',
      dataLabel,
      daysLabel,
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}${isDe ? '' : `/${locale}`}/tariffs/${tariff.slug}`,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: 'PureSim Logo',
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [`${baseUrl}/logo.png`],
    },
    alternates: buildAlternates(locale, {
      dePath: `tariffs/${tariff.slug}`,
      enPath: `tariffs/${tariff.slug}`,
    }),
  };
}

export default async function TariffDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const isDe = locale === 'de';
  const prefix = isDe ? '' : `/${locale}`;

  const tariff = await getTariff(slug);

  if (!tariff) {
    const dest = await getDestinationBySlug(slug);
    if (dest) {
      redirect(`${prefix}/esim/${dest.slug}`);
    }
    notFound();
  }

  const countryLabel = displayCountryName(tariff, locale);
  let dataLabel = formatGb(tariff.data_gb);
  if (tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0) {
    const localizedFullName = formatLocalizedTariffName(tariff.name, countryLabel, tariff.country_name, locale);
    if (localizedFullName.includes(' · ')) {
      dataLabel = localizedFullName.split(' · ').slice(1).join(' · ');
    } else {
      dataLabel = 'Unlimited';
    }
  } else if (locale === 'fi') {
    dataLabel = dataLabel.replace(/\bGB\b/g, 'Gt').replace(/\bMB\b/g, 'Mt');
  }

  const daysLabel = formatDaysWithUnit(tariff.validity_days, locale);
  const priceFormatted = formatCurrencyEuro(tariff.customer_price_eur ?? tariff.sale_price_eur, locale);
  const description = t('meta_tariff_slug_desc', {
    country: countryLabel,
    data: dataLabel,
    days: daysLabel,
    price: priceFormatted,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';

  // Inject Structured Data for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${countryLabel} eSIM - ${dataLabel} (${daysLabel})`,
    description,
    image: `${baseUrl}/logo.png`,
    brand: {
      '@type': 'Brand',
      name: 'PureSim',
    },
    offers: {
      '@type': 'Offer',
      price: Number(tariff.customer_price_eur ?? tariff.sale_price_eur).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}${isDe ? '' : `/${locale}`}/tariffs/${tariff.slug}`,
      priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
        .toISOString()
        .split('T')[0], // 90 days from now
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TariffDetailPageClient tariff={tariff} />
    </>
  );
}
