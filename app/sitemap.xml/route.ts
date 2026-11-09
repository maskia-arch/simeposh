import { SUPPORTED_LOCALES } from '@/lib/i18n/config';
import { BASE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const sitemaps = SUPPORTED_LOCALES.map(
    (l) => `  <sitemap>\n    <loc>${BASE_URL}/sitemap/${l.code}.xml</loc>\n  </sitemap>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
