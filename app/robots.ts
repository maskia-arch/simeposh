import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/checkout',
          '/cart',
          '/order',
          '/success',
          '/api/',
        ],
      },
      {
        userAgent: [
          'SemrushBot',
          'AhrefsBot',
          'MJ12bot',
          'DotBot',
          'PetalBot',
          'Scrapy',
          'coccocbot',
        ],
        disallow: '/',
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
