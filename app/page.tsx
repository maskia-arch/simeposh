import { createClient } from '@/lib/supabase/server';
import { HomePageClient } from '@/components/HomePageClient';
import { isRegionCode } from '@/lib/tariff-display';
import type { Destination } from '@/components/HeroSearch';
import { getServerLocale } from '@/lib/i18n/server';

export const revalidate = 600;

async function getFeaturedDestinations() {
  const supabase = await createClient();

  // 1. Fetch completed/paid/provisioning orders from the last 90 days to determine popularity
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orders } = await supabase
    .from('orders')
    .select('tariff_id')
    .in('status', ['completed', 'paid', 'provisioning'])
    .gte('created_at', ninetyDaysAgo) as any;

  // 2. Fetch all active travel tariffs (using range paging to be safe against PostgREST limits)
  const PAGE = 1000;
  const allTariffs: any[] = [];
  for (let from = 0; from < 100_000; from += PAGE) {
    const { data } = await supabase
      .from('tariffs')
      .select('id, country_code, country_name, flag_emoji, sale_price_eur, location_codes, region')
      .eq('is_active', true)
      .range(from, from + PAGE - 1) as any;
    if (!data || data.length === 0) break;
    allTariffs.push(...data);
    if (data.length < PAGE) break;
  }

  // 3. Group by country code to calculate min_price_eur and map tariff_id -> country_code
  const countryMap = new Map<string, { country_code: string; country_name: string; flag_emoji: string | null; min_price_eur: number; location_codes: string[] | null; region: string | null }>();
  const tariffToCountry = new Map<string, string>();

  for (const t of allTariffs) {
    if (!t.country_code) continue;
    tariffToCountry.set(t.id, t.country_code);

    const price = t.sale_price_eur ?? 999;
    const existing = countryMap.get(t.country_code);
    if (existing) {
      if (price < existing.min_price_eur) {
        existing.min_price_eur = price;
      }
    } else {
      countryMap.set(t.country_code, {
        country_code: t.country_code,
        country_name: t.country_name,
        flag_emoji: t.flag_emoji,
        min_price_eur: price,
        location_codes: t.location_codes,
        region: t.region,
      });
    }
  }

  // 4. Count occurrences of each country from sales
  const countrySales: Record<string, number> = {};
  if (orders) {
    for (const o of orders) {
      if (o.tariff_id) {
        const code = tariffToCountry.get(o.tariff_id);
        if (code) {
          countrySales[code] = (countrySales[code] || 0) + 1;
        }
      }
    }
  }

  // 5. Sort countries by sales count descending
  const sortedCountryCodes = Object.keys(countrySales).sort((a, b) => countrySales[b] - countrySales[a]);
  const popularCountryCodes = sortedCountryCodes.filter((code) => countryMap.has(code));

  // 6. Build the popular list and fill with DACH-first fallbacks
  const featuredDestinations: any[] = [];
  const addedCodes = new Set<string>();

  for (const code of popularCountryCodes) {
    const dest = countryMap.get(code);
    if (dest) {
      featuredDestinations.push(dest);
      addedCodes.add(code);
    }
  }

  if (featuredDestinations.length < 8) {
    const fallbackCodes = ['DE', 'AT', 'CH', 'TR', 'IT', 'ES', 'FR', 'GB', 'US', 'TH', 'EG', 'GR'];
    for (const code of fallbackCodes) {
      if (!addedCodes.has(code)) {
        const dest = countryMap.get(code);
        if (dest) {
          featuredDestinations.push(dest);
          addedCodes.add(code);
          if (featuredDestinations.length >= 8) break;
        }
      }
    }
  }

  if (featuredDestinations.length < 8) {
    for (const dest of Array.from(countryMap.values())) {
      if (!addedCodes.has(dest.country_code)) {
        featuredDestinations.push(dest);
        addedCodes.add(dest.country_code);
        if (featuredDestinations.length >= 8) break;
      }
    }
  }

  return featuredDestinations.slice(0, 8);
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

async function getBlogPosts(locale: string) {
  const supabase = await createClient();

  // Fetch latest published guide
  const { data: guidePosts } = (await supabase
    .from('posts')
    .select('id, title, slug, excerpt, category, featured_image, published_at, created_at, post_translations(locale, title, slug, excerpt)')
    .eq('is_published', true)
    .eq('status', 'approved')
    .eq('category', 'guide')
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)) as any;

  // Fetch latest 2 news
  const { data: newsPosts } = (await supabase
    .from('posts')
    .select('id, title, slug, excerpt, category, featured_image, published_at, created_at, post_translations(locale, title, slug, excerpt)')
    .eq('is_published', true)
    .eq('status', 'approved')
    .eq('category', 'news')
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(2)) as any;

  const mapPost = (post: any) => {
    if (!post) return null;
    const translation = post.post_translations?.find((tr: any) => tr.locale === locale);
    return {
      ...post,
      title: translation?.title || post.title,
      slug: translation?.slug || post.slug,
      excerpt: translation?.excerpt || post.excerpt,
    };
  };

  return {
    featuredGuide: mapPost(guidePosts?.[0]) || null,
    latestNews: (newsPosts ?? []).map(mapPost).filter(Boolean),
  };
}

export default async function HomePage() {
  const locale = await getServerLocale();
  const [popularDestinations, destinations, blogData] = await Promise.all([
    getFeaturedDestinations(),
    getDestinations(),
    getBlogPosts(locale),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';

  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PureSim',
    alternateName: ['PureSim eSIM', 'puresim.net'],
    url: baseUrl,
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PureSim',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HomePageClient
        popularDestinations={popularDestinations}
        destinations={destinations}
        featuredGuide={blogData.featuredGuide}
        latestNews={blogData.latestNews}
      />
    </>
  );
}
