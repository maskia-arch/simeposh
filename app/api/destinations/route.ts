import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isRegionCode } from '@/lib/tariff-display';
import type { Destination } from '@/components/HeroSearch';

export const runtime = 'nodejs';
export const revalidate = 600; // cache for 10 minutes

export async function GET() {
  try {
    const supabase = createServiceClient();
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

    return NextResponse.json({ destinations: Array.from(seen.values()) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
