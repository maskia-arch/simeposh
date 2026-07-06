import { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';

  // 1. Core static routes
  const routes = [
    '',
    '/tariffs',
    '/blog',
    '/agb',
    '/datenschutz',
    '/refund-policy',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Query active eSIM tariffs
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
          sitemapEntries.push({
            url: `${baseUrl}/tariffs/${t.slug}`,
            lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      });
    }
  } catch (err) {
    console.error('[Sitemap] Unexpected error fetching tariffs:', err);
  }

  // 3. Query approved and published blog articles
  try {
    const supabase = createServiceClient();
    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, updated_at')
      .eq('is_published', true)
      .eq('status', 'approved');

    if (error) {
      console.error('[Sitemap] Posts fetch error:', error.message);
    } else if (posts) {
      posts.forEach((p) => {
        if (p.slug) {
          sitemapEntries.push({
            url: `${baseUrl}/blog/${p.slug}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.5,
          });
        }
      });
    }
  } catch (err) {
    console.error('[Sitemap] Unexpected error fetching posts:', err);
  }

  return sitemapEntries;
}
