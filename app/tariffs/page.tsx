import type { Metadata } from 'next';
import { createClient }   from '@/lib/supabase/server';
import { TariffsPageClient } from './TariffsPageClient';

export const metadata: Metadata = { title: 'Plans | eSIM Shop' };
export const revalidate = 3600;

async function getTariffs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tariffs')
    .select('*')
    .eq('is_active', true)
    .order('sale_price_eur', { ascending: true });
  return data ?? [];
}

export default async function TariffsPage() {
  const tariffs = await getTariffs();
  return <TariffsPageClient tariffs={tariffs} />;
}
