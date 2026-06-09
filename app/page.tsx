import { createClient } from '@/lib/supabase/server';
import { HomePageClient } from '@/components/HomePageClient';
import { isRegionCode } from '@/lib/tariff-display';
import type { Destination } from '@/components/HeroSearch';

export const revalidate = 600;

async function getFeaturedTariffs() {
  const supabase = await createClient();
  // Homepage shows only Travel tariffs (fixed data) as teasers
  const { data } = await supabase
    .from('tariffs')
    .select('*')
    .eq('is_active', true)
    .eq('tariff_type', 'travel')
    .order('sale_price_eur', { ascending: true })
    .limit(8);
  return data ?? [];
}

/**
 * Build the distinct destination list (countries + regions) for the hero search.
 * Pages through all active tariffs (PostgREST caps a single response at 1000).
 */
async function getDestinations(): Promise<Destination[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const seen = new Map<string, Destination>();

  for (let from = 0; from < 200_000; from += PAGE) {
    const { data } = await supabase
      .from('tariffs')
      .select('country_code, country_name, flag_emoji')
      .eq('is_active', true)
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    const rows = data as Array<{ country_code: string; country_name: string; flag_emoji: string | null }>;
    for (const t of rows) {
      const code = t.country_code;
      if (!code) continue;
      const existing = seen.get(code);
      if (existing) existing.count++;
      else seen.set(code, {
        code,
        name:     t.country_name,
        flag:     t.flag_emoji,
        isRegion: isRegionCode(code),
        count:    1,
      });
    }
    if (data.length < PAGE) break;
  }

  return Array.from(seen.values());
}

export default async function HomePage() {
  const [tariffs, destinations] = await Promise.all([
    getFeaturedTariffs(),
    getDestinations(),
  ]);
  return <HomePageClient tariffs={tariffs} destinations={destinations} />;
}
