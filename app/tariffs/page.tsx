import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient }      from '@/lib/supabase/server';
import { TariffsPageClient } from './TariffsPageClient';
import { toPublicTariff, getCachedTariffsPage, setCachedTariffsPage, type PublicTariff } from '@/lib/tariffs';
import { getTariffMinCustomerPrice } from '@/lib/pricing';
import { getDestinationBySlug } from '@/lib/destinations';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { formatLocalizedTariffName, displayCountryName } from '@/lib/tariff-display';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  return {
    title: t('meta_tariffs_title' as any) || (locale === 'de' ? 'Tarife & eSIM Pakete' : 'Plans & eSIM Packages'),
    description: t('meta_tariffs_desc' as any) || (locale === 'de'
      ? 'Finde günstige eSIM-Tarife für über 150 Länder weltweit.'
      : 'Find affordable eSIM plans for over 150 countries worldwide.'),
    alternates: buildAlternates(locale, { dePath: 'tariffs', enPath: 'tariffs' }),
    openGraph: {
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
    },
  };
}

// Revalidate every 10 minutes so freshly-synced tariffs appear quickly
export const revalidate = 600;

let inFlightTariffsPromise: Promise<PublicTariff[]> | null = null;

async function getTariffs(): Promise<PublicTariff[]> {
  const cached = getCachedTariffsPage();
  if (cached) {
    return cached;
  }

  if (inFlightTariffsPromise) {
    return inFlightTariffsPromise;
  }

  inFlightTariffsPromise = (async () => {
    try {
      const supabase = await createClient();
      const PAGE = 1000;
      const all: PublicTariff[] = [];

      for (let from = 0; from < 200_000; from += PAGE) {
        const { data, error } = await supabase
          .from('tariffs')
          .select('id, package_code, slug, name, description, country_code, country_name, region, flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type, speed_kbps, label, is_top_up_eligible, active_type, support_top_up_type, discount_rule_code, raw_data')
          .eq('is_active', true)
          .order('country_name', { ascending: true })
          .order('sale_price_eur', { ascending: true })
          .range(from, from + PAGE - 1);

        if (error) {
          console.error('[tariffs] Query error:', error.message);
          break;
        }
        if (!data || data.length === 0) break;
        for (const row of data) {
          const t = toPublicTariff(row);
          if (t.tariff_type?.startsWith('unlimited') || t.data_gb === 0) {
            t.customer_price_eur = await getTariffMinCustomerPrice(row);
          } else {
            t.customer_price_eur = t.sale_price_eur;
          }
          all.push(t);
        }
        if (data.length < PAGE) break; // last (short) page
      }

      if (all.length > 0) {
        setCachedTariffsPage(all);
        return all;
      }
      return getCachedTariffsPage() ?? all;
    } catch (err) {
      console.error('[tariffs] Fetch error, returning stale cache if available:', err);
      return getCachedTariffsPage() ?? [];
    } finally {
      inFlightTariffsPromise = null;
    }
  })();

  return inFlightTariffsPromise;
}

export default async function TariffsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tab?: string }>;
}) {
  const locale = await getServerLocale();
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const params = await searchParams;
  const q = params.q?.trim();
  if (q) {
    const dest = await getDestinationBySlug(q);
    if (dest) {
      redirect(`${prefix}/esim/${dest.slug}`);
    }
  }

  const rawTariffs = await getTariffs();
  const tariffs: PublicTariff[] = rawTariffs.map((t) => {
    const countryLabel = displayCountryName(t, locale);
    const localizedName = formatLocalizedTariffName(t.name, countryLabel, t.country_name, locale);
    return {
      id: t.id,
      slug: t.slug,
      package_code: t.package_code,
      name: localizedName,
      description: null,
      country_code: t.country_code,
      country_name: t.country_name,
      region: t.region,
      flag_emoji: t.flag_emoji,
      location_codes: t.location_codes,
      data_gb: t.data_gb,
      validity_days: t.validity_days,
      sale_price_eur: t.sale_price_eur,
      customer_price_eur: t.customer_price_eur,
      tariff_type: t.tariff_type,
      speed_kbps: null,
      label: t.label,
      is_top_up_eligible: t.is_top_up_eligible,
      discount_rule_code: null,
      operators: (t.operators || []).slice(0, 4),
      breakout_ip: t.breakout_ip,
      best_network_type: t.best_network_type,
      is_premium: t.is_premium,
      is_non_hk_ip: t.is_non_hk_ip,
      is_reloadable: t.is_reloadable,
      reloadability_type: t.reloadability_type,
      throttle_speed: t.throttle_speed,
      network_speed: t.network_speed,
      activates_on_arrival: t.activates_on_arrival,
    };
  });
  const initialCategory = params.category ?? (params.tab === 'unlimited' ? 'unlimited_eco' : params.tab);
  return (
    <TariffsPageClient
      tariffs={tariffs}
      initialQuery={params.q ?? ''}
      initialCategory={initialCategory}
    />
  );
}
