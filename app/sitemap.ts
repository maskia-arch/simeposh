import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;
import { createServiceClient } from '@/lib/supabase/server';
import { getAllDestinations } from '@/lib/destinations';
import { getPool } from '@/lib/db';
import { BASE_URL } from '@/lib/seo';
import { SUPPORTED_LOCALES, type LocaleCode } from '@/lib/i18n/config';

export async function generateSitemaps() {
  return SUPPORTED_LOCALES.map((l) => ({ id: l.code }));
}

export default async function sitemap({
  id,
}: {
  id: string;
}): Promise<MetadataRoute.Sitemap> {
  const targetLocale = (SUPPORTED_LOCALES.some((l) => l.code === id) ? id : 'de') as LocaleCode;
  const baseUrl = BASE_URL;

  // Retrieve actual DB timestamps for lastmod
  let globalLatestMod = new Date('2026-11-09T12:00:00Z');
  const destUpdates = new Map<string, Date>();

  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT country_code, max(updated_at) as max_updated_at
      FROM tariffs
      WHERE is_active = true
      GROUP BY country_code
    `);
    for (const r of rows) {
      if (r.max_updated_at) {
        const d = new Date(r.max_updated_at);
        destUpdates.set(r.country_code, d);
        if (d > globalLatestMod) {
          globalLatestMod = d;
        }
      }
    }
  } catch (e) {
    console.error('[Sitemap] Failed to fetch tariff update timestamps:', e);
  }

  // Helper to build 15-language alternates for any path
  function buildLanguages(
    dePath: string,
    localizedPaths?: Partial<Record<LocaleCode, string>>
  ): Record<string, string> {
    const cleanDe = dePath.replace(/^\/+/, '');
    const langs: Record<string, string> = {};

    for (const { code } of SUPPORTED_LOCALES) {
      if (code === 'de') {
        langs.de = `${baseUrl}${cleanDe ? `/${cleanDe}` : ''}`;
      } else {
        const slug = localizedPaths?.[code] ?? (code === 'en' ? (localizedPaths?.en ?? cleanDe) : cleanDe);
        const cleanSlug = slug.replace(/^\/+/, '');
        langs[code] = `${baseUrl}/${code}${cleanSlug ? `/${cleanSlug}` : ''}`;
      }
    }
    langs['x-default'] = langs.en;
    return langs;
  }

  // 1. Core static routes (checkout, cart, order are omitted)
  const STATIC_ROUTE_DATES: Record<string, string> = {
    '/agb': '2026-11-01T00:00:00Z',
    '/datenschutz': '2026-11-01T00:00:00Z',
    '/refund-policy': '2026-11-01T00:00:00Z',
    '/faq': '2026-11-05T00:00:00Z',
    '/telegram': '2026-11-01T00:00:00Z',
    '/ai': '2026-11-05T00:00:00Z',
    '/blog': '2026-11-05T00:00:00Z',
    '/topup': '2026-11-05T00:00:00Z',
  };

  const routes = [
    '',
    '/esim',
    '/unlimited',
    '/tariffs',
    '/faq',
    '/topup',
    '/ai',
    '/blog',
    '/telegram',
    '/agb',
    '/datenschutz',
    '/refund-policy',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    const alternatesLanguages = buildLanguages(route);
    const pageUrl = alternatesLanguages[targetLocale] || alternatesLanguages.de;
    const staticDate = STATIC_ROUTE_DATES[route];

    sitemapEntries.push({
      url: pageUrl,
      lastModified: staticDate ? new Date(staticDate) : globalLatestMod,
      changeFrequency: staticDate ? 'monthly' : 'daily',
      priority: route === '' ? 1.0 : (staticDate ? 0.5 : 0.8),
      alternates: { languages: alternatesLanguages },
    });
  }

  // 2. Query destinations (country & region pages + unlimited configurator)
  try {
    const destinations = await getAllDestinations();
    destinations.forEach((d) => {
      if (d.slug) {
        const destMod = (d.code && destUpdates.get(d.code)) || globalLatestMod;

        // eSIM country page
        const esimLangs = buildLanguages(`/esim/${d.slug}`);
        sitemapEntries.push({
          url: esimLangs[targetLocale] || esimLangs.de,
          lastModified: destMod,
          changeFrequency: 'daily',
          priority: 0.9,
          alternates: { languages: esimLangs },
        });

        // Unlimited configurator route (only if destination offers unlimited tariffs)
        if (d.hasUnlimited) {
          const unlLangs = buildLanguages(`/unlimited/${d.slug}`);
          sitemapEntries.push({
            url: unlLangs[targetLocale] || unlLangs.de,
            lastModified: destMod,
            changeFrequency: 'daily',
            priority: 0.8,
            alternates: { languages: unlLangs },
          });
        }
      }
    });
  } catch (err) {
    console.error('[Sitemap] Unexpected error fetching destinations:', err);
  }

  // 3. Query active eSIM tariffs
  try {
    const supabase = createServiceClient();
    const { data: tariffs, error } = await supabase
      .from('tariffs')
      .select('slug, updated_at')
      .eq('is_active', true)
      .is('hidden_reason', null);

    if (error) {
      console.error('[Sitemap] Tariffs fetch error:', error.message);
    } else if (tariffs) {
      tariffs.forEach((t) => {
        if (t.slug) {
          const tariffLangs = buildLanguages(`/tariffs/${t.slug}`);
          const modTime = t.updated_at ? new Date(t.updated_at) : globalLatestMod;

          sitemapEntries.push({
            url: tariffLangs[targetLocale] || tariffLangs.de,
            lastModified: modTime,
            changeFrequency: 'weekly',
            priority: 0.6,
            alternates: { languages: tariffLangs },
          });
        }
      });
    }
  } catch (err) {
    console.error('[Sitemap] Unexpected error fetching tariffs:', err);
  }

  // 4. Query approved and published blog articles with translations
  try {
    const supabase = createServiceClient();
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, slug, updated_at, post_translations(locale, slug)')
      .eq('is_published', true)
      .eq('status', 'approved');

    if (error) {
      console.error('[Sitemap] Posts fetch error:', error.message);
    } else if (posts) {
      posts.forEach((p: any) => {
        if (p.slug) {
          const localizedSlugs: Partial<Record<LocaleCode, string>> = {};
          if (Array.isArray(p.post_translations)) {
            p.post_translations.forEach((pt: any) => {
              if (pt.locale && pt.slug) {
                localizedSlugs[pt.locale as LocaleCode] = `blog/${pt.slug}`;
              }
            });
          }

          const blogLangs = buildLanguages(`blog/${p.slug}`, localizedSlugs);
          const modTime = p.updated_at ? new Date(p.updated_at) : globalLatestMod;

          sitemapEntries.push({
            url: blogLangs[targetLocale] || blogLangs.de,
            lastModified: modTime,
            changeFrequency: 'weekly',
            priority: 0.5,
            alternates: { languages: blogLangs },
          });
        }
      });
    }
  } catch (err) {
    console.error('[Sitemap] Unexpected error fetching posts:', err);
  }

  return sitemapEntries;
}
