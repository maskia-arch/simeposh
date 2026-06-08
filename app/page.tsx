import { createClient } from '@/lib/supabase/server';
import { HomePageClient } from '@/components/HomePageClient';

export const revalidate = 3600;

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

export default async function HomePage() {
  const tariffs = await getFeaturedTariffs();
  return <HomePageClient tariffs={tariffs} />;
}
