import { buildAlternates, BASE_URL } from '@/lib/seo';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect, permanentRedirect } from 'next/navigation';
import NotFound from '@/app/not-found';
import { createClient } from '@/lib/supabase/server';
import { getPool } from '@/lib/db';
import TariffDetailPageClient from './TariffDetailPageClient';
import { toPublicTariff, getTariffCanonicalPath, type PublicTariff } from '@/lib/tariffs';
import { getTariffMinCustomerPrice } from '@/lib/pricing';
import { getActivePromotion, calculatePromoPriceCents } from '@/lib/pricing-service';
import { getDestinationBySlug } from '@/lib/destinations';
import { displayCountryName, formatLocalizedTariffName } from '@/lib/tariff-display';
import { formatGb } from '@/lib/utils';
import { formatDaysWithUnit } from '@/lib/i18n/plural';
import { formatCurrencyEuro } from '@/lib/currency';

const PUBLIC_SELECT_FIELDS = 'id, package_code, slug, name, description, country_code, country_name, region, flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type, speed_kbps, label, is_top_up_eligible, active_type, support_top_up_type, is_premium, breakout_ip, ip_countries, premium_diff_chip';
const SERVER_SELECT_FIELDS = `${PUBLIC_SELECT_FIELDS}, raw_data`;

export const dynamic = 'force-dynamic';

const tariffDetailCache = new Map<string, { data: PublicTariff | null; timestamp: number }>();
const inFlightTariffPromises = new Map<string, Promise<PublicTariff | null>>();
const TARIFF_DETAIL_TTL = 10 * 60 * 1000; // 10 minutes

async function applyPromoToTariff(tariff: PublicTariff): Promise<void> {
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
  if (isUnlimited) return;

  const promo = await getActivePromotion();
  if (promo && promo.discount_basis_points > 0) {
    const regCents = Math.round((tariff.customer_price_eur ?? tariff.sale_price_eur) * 100);
    const calc = calculatePromoPriceCents(regCents, promo.discount_basis_points, promo.rounding_strategy);
    if (calc.applied) {
      if (promo.show_reference_price) {
        tariff.reference_price_eur = tariff.customer_price_eur ?? tariff.sale_price_eur;
      }
      tariff.customer_price_eur = calc.promoCents / 100;
      tariff.promo_discount_percent = Math.round(promo.discount_basis_points / 100);
      tariff.promo_badge = promo.badge_texts?.['de'] || `−${Math.round(promo.discount_basis_points / 100)} %`;
    }
  }
}

async function getTariff(slug: string): Promise<PublicTariff | null> {
  const normalizedSlug = slug.toLowerCase().trim();
  const cached = tariffDetailCache.get(normalizedSlug);
  if (cached && Date.now() - cached.timestamp < TARIFF_DETAIL_TTL) {
    return cached.data;
  }

  if (inFlightTariffPromises.has(normalizedSlug)) {
    return inFlightTariffPromises.get(normalizedSlug)!;
  }

  const promise = (async () => {
    try {
      const decoded = decodeURIComponent(slug).trim();

      // Prioritize package_code (case-insensitive) then slug (case-insensitive)
      try {
        const pool = getPool();
        const { rows } = await pool.query(
          `SELECT ${SERVER_SELECT_FIELDS}
           FROM tariffs
           WHERE (LOWER(package_code) = LOWER($1) OR LOWER(slug) = LOWER($1))
             AND is_active = true
           ORDER BY CASE WHEN LOWER(package_code) = LOWER($1) THEN 0 ELSE 1 END
           LIMIT 1`,
          [decoded]
        );
        if (rows && rows.length > 0) {
          const res = toPublicTariff(rows[0]);
          res.customer_price_eur = await getTariffMinCustomerPrice(rows[0]);
          await applyPromoToTariff(res);
          tariffDetailCache.set(normalizedSlug, { data: res, timestamp: Date.now() });
          return res;
        }
      } catch (poolErr) {
        console.warn('[getTariff] pool query fallback:', poolErr);
      }

      // Supabase fallback if pool fails
      const supabase = await createClient();
      const codeUpper = decoded.toUpperCase();

      const { data } = await supabase
        .from('tariffs')
        .select(SERVER_SELECT_FIELDS)
        .or(`package_code.eq.${codeUpper},slug.eq.${decoded}`)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (data) {
        const res = toPublicTariff(data);
        res.customer_price_eur = await getTariffMinCustomerPrice(data);
        await applyPromoToTariff(res);
        tariffDetailCache.set(normalizedSlug, { data: res, timestamp: Date.now() });
        return res;
      }

      tariffDetailCache.set(normalizedSlug, { data: null, timestamp: Date.now() });
      return null;
    } catch (err) {
      console.error('[getTariff] lookup error:', slug, err);
      return null;
    } finally {
      inFlightTariffPromises.delete(normalizedSlug);
    }
  })();

  inFlightTariffPromises.set(normalizedSlug, promise);
  return promise;
}

async function resolveLegacyTariffRedirect(slug: string, prefix: string, locale: string = 'de'): Promise<string | null> {
  const clean = slug.trim().toLowerCase();

  // Direct country code/slug under /tariffs/ (e.g. /tariffs/la, /tariffs/in, /tariffs/jp, etc.)
  if (clean === 'la') {
    return `${prefix}/esim/latin-america`;
  }
  if (['in', 'jp', 'tr', 'de', 'us'].includes(clean)) {
    const dest = await getDestinationBySlug(clean);
    if (dest) return `${prefix}/esim/${dest.slug}`;
  }

  // Legacy pattern 1: {country}_{gb}_{days}
  const matchUnderscore = clean.match(/^([a-z0-9-]+)_(\d+(?:\.\d+)?)_(\d+)$/i);
  if (matchUnderscore) {
    let rawCountry = matchUnderscore[1].toLowerCase();
    const dataGb = parseFloat(matchUnderscore[2]);
    const validityDays = parseInt(matchUnderscore[3], 10);

    if (rawCountry === 'la') rawCountry = 'latin-america';
    else if (rawCountry === 'in') rawCountry = 'india';
    else if (rawCountry === 'jp') rawCountry = 'japan';
    else if (rawCountry === 'tr') rawCountry = 'turkey';
    else if (rawCountry === 'de') rawCountry = 'germany';
    else if (rawCountry === 'us') rawCountry = 'united-states';

    const dest = await getDestinationBySlug(rawCountry);
    if (dest) {
      try {
        const pool = getPool();
        const { rows } = await pool.query(
          `SELECT package_code, slug FROM tariffs
           WHERE (country_code = $1 OR country_code = $2)
             AND data_gb = $3 AND validity_days = $4
             AND is_active = true
           ORDER BY sale_price_eur ASC LIMIT 1`,
          [dest.code, dest.code.toUpperCase(), dataGb, validityDays]
        );
        if (rows && rows.length > 0 && rows[0].package_code) {
          return getTariffCanonicalPath(rows[0].package_code, locale as any);
        }
      } catch (_) {}
      return `${prefix}/esim/${dest.slug}`;
    }
  }

  // Legacy pattern 2: {country}-{gb}gb-{days}days
  const matchHyphen = clean.match(/^([a-z0-9-]+)-(\d+(?:\.\d+)?)gb-(\d+)days?$/i);
  if (matchHyphen) {
    let rawCountry = matchHyphen[1].toLowerCase();
    const dataGb = parseFloat(matchHyphen[2]);
    const validityDays = parseInt(matchHyphen[3], 10);

    if (rawCountry === 'la') rawCountry = 'latin-america';
    else if (rawCountry === 'in') rawCountry = 'india';
    else if (rawCountry === 'jp') rawCountry = 'japan';
    else if (rawCountry === 'tr') rawCountry = 'turkey';
    else if (rawCountry === 'de') rawCountry = 'germany';
    else if (rawCountry === 'us') rawCountry = 'united-states';

    const dest = await getDestinationBySlug(rawCountry);
    if (dest) {
      try {
        const pool = getPool();
        const { rows } = await pool.query(
          `SELECT package_code, slug FROM tariffs
           WHERE (country_code = $1 OR country_code = $2)
             AND data_gb = $3 AND validity_days = $4
             AND is_active = true
           ORDER BY sale_price_eur ASC LIMIT 1`,
          [dest.code, dest.code.toUpperCase(), dataGb, validityDays]
        );
        if (rows && rows.length > 0 && rows[0].package_code) {
          return getTariffCanonicalPath(rows[0].package_code, locale as any);
        }
      } catch (_) {}
      return `${prefix}/esim/${dest.slug}`;
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const tariff = await getTariff(slug);
  if (!tariff) {
    const prefix = locale === 'de' ? '' : `/${locale}`;
    const legacyRedirect = await resolveLegacyTariffRedirect(slug, prefix, locale);
    if (legacyRedirect) {
      permanentRedirect(legacyRedirect);
    }
    const dest = await getDestinationBySlug(slug);
    if (dest) {
      permanentRedirect(`${prefix}/esim/${dest.slug}`);
    }
    return {
      title: { absolute: `${t('page_not_found_title' as any) || (locale === 'de' ? 'Seite nicht gefunden' : 'Page Not Found')} · PureSim` },
      robots: { index: false, follow: false },
    };
  }

  // Canonical redirect if accessed via old slug, non-canonical casing or unencoded segment
  if (decodeURIComponent(slug).trim() !== tariff.package_code) {
    permanentRedirect(getTariffCanonicalPath(tariff.package_code, locale));
  }

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
  }

  const daysLabel = formatDaysWithUnit(tariff.validity_days, locale);
  const priceFormatted = formatCurrencyEuro(tariff.customer_price_eur ?? tariff.sale_price_eur, locale);

  const buyPrefixMap: Record<string, string> = {
    de: `eSIM ${country} ${dataLabel} kaufen`,
    en: `Buy eSIM ${country} ${dataLabel}`,
    fr: `Acheter eSIM ${country} ${dataLabel}`,
    es: `Comprar eSIM ${country} ${dataLabel}`,
    it: `Acquista eSIM ${country} ${dataLabel}`,
    nl: `Koop eSIM ${country} ${dataLabel}`,
    pl: `Kup eSIM ${country} ${dataLabel}`,
    pt: `Comprar eSIM ${country} ${dataLabel}`,
    tr: `eSIM Satın Al ${country} ${dataLabel}`,
    sv: `Köp eSIM ${country} ${dataLabel}`,
    da: `Køb eSIM ${country} ${dataLabel}`,
    fi: `Osta eSIM ${country} ${dataLabel}`,
    cs: `Koupit eSIM ${country} ${dataLabel}`,
    ro: `Cumpără eSIM ${country} ${dataLabel}`,
    hu: `eSIM vásárlás ${country} ${dataLabel}`,
  };

  const title = buyPrefixMap[locale] || `Buy eSIM ${country} ${dataLabel}`;

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
      url: `${baseUrl}${getTariffCanonicalPath(tariff.package_code, locale)}`,
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
      dePath: `tariffs/${encodeURIComponent(tariff.package_code)}`,
      enPath: `tariffs/${encodeURIComponent(tariff.package_code)}`,
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
    const legacyRedirect = await resolveLegacyTariffRedirect(slug, prefix, locale);
    if (legacyRedirect) {
      permanentRedirect(legacyRedirect);
    }
    const dest = await getDestinationBySlug(slug);
    if (dest) {
      permanentRedirect(`${prefix}/esim/${dest.slug}`);
    }
    notFound();
  }

  // Canonical redirect if accessed via old slug, non-canonical casing or unencoded segment
  if (decodeURIComponent(slug).trim() !== tariff.package_code) {
    permanentRedirect(getTariffCanonicalPath(tariff.package_code, locale));
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
  const canonicalPath = getTariffCanonicalPath(tariff.package_code, locale);
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

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
      url: canonicalUrl,
      priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
        .toISOString()
        .split('T')[0], // 90 days from now
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('nav_home' as any) || 'Home',
        item: `${baseUrl}${isDe ? '' : `/${locale}`}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t('nav_tariffs' as any) || 'eSIM',
        item: `${baseUrl}${isDe ? '' : `/${locale}`}/tariffs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: countryLabel,
        item: canonicalUrl,
      },
    ],
  };

  const clientTariff = {
    ...tariff,
    name: formatLocalizedTariffName(tariff.name, countryLabel, tariff.country_name, locale),
    description: formatLocalizedTariffName(tariff.description || tariff.name, countryLabel, tariff.country_name, locale),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <TariffDetailPageClient tariff={clientTariff} />
    </>
  );
}
