import { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { getAllDestinations } from '@/lib/destinations';
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
  const routes = [
    '',
    '/tariffs',
    '/topup',
    '/ai',
    '/blog',
    '/agb',
    '/datenschutz',
    '/refund-policy',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    const alternatesLanguages = buildLanguages(route);
    const pageUrl = alternatesLanguages[targetLocale] || alternatesLanguages.de;

    sitemapEntries.push({
      url: pageUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: route === '' ? 1.0 : 0.8,
      alternates: { languages: alternatesLanguages },
    });
  }

  // 2. Query destinations (country & region pages + unlimited configurator)
  try {
    const destinations = await getAllDestinations();
    destinations.forEach((d) => {
      if (d.slug) {
        // eSIM country page
        const esimLangs = buildLanguages(`/esim/${d.slug}`);
        sitemapEntries.push({
          url: esimLangs[targetLocale] || esimLangs.de,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.9,
          alternates: { languages: esimLangs },
        });

        // Unlimited configurator route
        const unlLangs = buildLanguages(`/unlimited/${d.slug}`);
        sitemapEntries.push({
          url: unlLangs[targetLocale] || unlLangs.de,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
          alternates: { languages: unlLangs },
        });
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
      .eq('is_active', true);

    if (error) {
      console.error('[Sitemap] Tariffs fetch error:', error.message);
    } else if (tariffs) {
      tariffs.forEach((t) => {
        if (t.slug) {
          const tariffLangs = buildLanguages(`/tariffs/${t.slug}`);
          const modTime = t.updated_at ? new Date(t.updated_at) : new Date();

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
          const modTime = p.updated_at ? new Date(p.updated_at) : new Date();

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
