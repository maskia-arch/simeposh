import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient }      from '@/lib/supabase/server';
import { TariffsPageClient } from './TariffsPageClient';
import { toPublicTariff, type PublicTariff } from '@/lib/tariffs';
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

/**
 * Load ALL active tariffs mapped to safe PublicTariff DTOs.
 *
 * CRITICAL:
 * - Sensitive columns (ek_price_usd, usd_eur_rate) are NEVER selected from the DB.
 * - raw_data is only read on the server to extract operators & breakout IP, then discarded.
 * - Client components receive strictly whitelisted PublicTariff objects.
 */
async function getTariffs(): Promise<PublicTariff[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: PublicTariff[] = [];

  for (let from = 0; from < 200_000; from += PAGE) {
    const { data, error } = await supabase
      .from('tariffs')
      .select('id, package_code, slug, name, description, country_code, country_name, region, flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type, speed_kbps, label, is_top_up_eligible, raw_data')
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
      all.push(toPublicTariff(row));
    }
    if (data.length < PAGE) break; // last (short) page
  }

  return all;
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
