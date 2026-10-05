import { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { getAllDestinations } from '@/lib/destinations';
import { BASE_URL } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = BASE_URL;

  // 1. Core static routes (German URL at root, English at /en/...)
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
    const deUrl = `${baseUrl}${route}`;
    const enUrl = `${baseUrl}/en${route}`;
    const alternates = {
      languages: {
        de: deUrl,
        en: enUrl,
        'x-default': enUrl,
      },
    };

    // DE entry
    sitemapEntries.push({
      url: deUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: route === '' ? 1.0 : 0.8,
      alternates,
    });

    // EN entry
    sitemapEntries.push({
      url: enUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: route === '' ? 1.0 : 0.8,
      alternates,
    });
  }

  // 2. Query destinations (country & region pages)
  try {
    const destinations = await getAllDestinations();
    destinations.forEach((d) => {
      if (d.slug) {
        const deUrl = `${baseUrl}/esim/${d.slug}`;
        const enUrl = `${baseUrl}/en/esim/${d.slug}`;
        const alternates = {
          languages: {
            de: deUrl,
            en: enUrl,
            'x-default': enUrl,
          },
        };

        sitemapEntries.push({
          url: deUrl,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.9,
          alternates,
        });

        sitemapEntries.push({
          url: enUrl,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.9,
          alternates,
        });

        // Unlimited configurator routes
        const deUnlUrl = `${baseUrl}/unlimited/${d.slug}`;
        const enUnlUrl = `${baseUrl}/en/unlimited/${d.slug}`;
        const unlAlternates = {
          languages: {
            de: deUnlUrl,
            en: enUnlUrl,
            'x-default': enUnlUrl,
          },
        };

        sitemapEntries.push({
          url: deUnlUrl,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
          alternates: unlAlternates,
        });

        sitemapEntries.push({
          url: enUnlUrl,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
          alternates: unlAlternates,
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
          const deUrl = `${baseUrl}/tariffs/${t.slug}`;
          const enUrl = `${baseUrl}/en/tariffs/${t.slug}`;
          const alternates = {
            languages: {
              de: deUrl,
              en: enUrl,
              'x-default': enUrl,
            },
          };
          const modTime = t.updated_at ? new Date(t.updated_at) : new Date();

          sitemapEntries.push({
            url: deUrl,
            lastModified: modTime,
            changeFrequency: 'weekly',
            priority: 0.6,
            alternates,
          });

          sitemapEntries.push({
            url: enUrl,
            lastModified: modTime,
            changeFrequency: 'weekly',
            priority: 0.6,
            alternates,
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
          const enTrans = p.post_translations?.find((t: any) => t.locale === 'en');
          const enSlug = enTrans?.slug || p.slug;

          const deUrl = `${baseUrl}/blog/${p.slug}`;
          const enUrl = `${baseUrl}/en/blog/${enSlug}`;
          const alternates = {
            languages: {
              de: deUrl,
              en: enUrl,
              'x-default': enUrl,
            },
          };
          const modTime = p.updated_at ? new Date(p.updated_at) : new Date();

          sitemapEntries.push({
            url: deUrl,
            lastModified: modTime,
            changeFrequency: 'weekly',
            priority: 0.5,
            alternates,
          });

          sitemapEntries.push({
            url: enUrl,
            lastModified: modTime,
            changeFrequency: 'weekly',
            priority: 0.5,
            alternates,
          });
        }
      });
    }
  } catch (err) {
    console.error('[Sitemap] Unexpected error fetching posts:', err);
  }

  return sitemapEntries;
}
