import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient }      from '@/lib/supabase/server';
import { TariffsPageClient } from './TariffsPageClient';
import { toPublicTariff, getCachedTariffsPage, setCachedTariffsPage, type PublicTariff } from '@/lib/tariffs';
import { getTariffMinCustomerPrice } from '@/lib/pricing';
import { getDestinationBySlug } from '@/lib/destinations';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';

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

  const tariffs = await getTariffs();
  const initialCategory = params.category ?? (params.tab === 'unlimited' ? 'unlimited_eco' : params.tab);
  return (
    <TariffsPageClient
      tariffs={tariffs}
      initialQuery={params.q ?? ''}
      initialCategory={initialCategory}
    />
  );
}
