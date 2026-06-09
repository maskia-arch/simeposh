import type { Metadata } from 'next';
import { createClient }      from '@/lib/supabase/server';
import { TariffsPageClient } from './TariffsPageClient';
import type { Database }     from '@/lib/supabase/types';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

export const metadata: Metadata = { title: 'Plans | eSIM Shop' };

// Revalidate every 10 minutes so freshly-synced tariffs appear quickly
export const revalidate = 600;

/**
 * Load ALL active tariffs.
 *
 * CRITICAL: Supabase / PostgREST caps a single response at `max-rows`
 * (1000 by default). A plain `.limit(50000)` is silently truncated to 1000,
 * which is why the customer page only ever showed the first ~1000 tariffs
 * alphabetically (everything from "G…" onward — incl. Germany — was missing,
 * while the admin page used pagination and showed them correctly).
 *
 * We therefore page through the table with `.range()` until a short page
 * signals the end. This reliably returns the complete catalogue.
 */
async function getTariffs(): Promise<Tariff[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: Tariff[] = [];

  for (let from = 0; from < 200_000; from += PAGE) {
    const { data, error } = await supabase
      .from('tariffs')
      .select('*')
      .eq('is_active', true)
      .order('country_name', { ascending: true })
      .order('sale_price_eur', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('[tariffs] Query error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as Tariff[]));
    if (data.length < PAGE) break; // last (short) page
  }

  return all;
}

export default async function TariffsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [tariffs, params] = await Promise.all([getTariffs(), searchParams]);
  return <TariffsPageClient tariffs={tariffs} initialQuery={params.q ?? ''} />;
}
