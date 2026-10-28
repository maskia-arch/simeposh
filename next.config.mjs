/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Render deployment (efficient Docker-like builds)
  output: 'standalone',

  experimental: {
    instrumentationHook: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.esimaccess.com',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },

  // Disable X-Powered-By: Next.js
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          {
            key:   'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key:   'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://puresimaisupport.autoacts.link",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://flagcdn.com https://coin-images.coingecko.com https://*.esimaccess.com https://puresim.net",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://puresimaisupport.autoacts.link",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/tariffs',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/tariffs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/:locale(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)/tariffs',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/:locale(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)/tariffs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/esim',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/esim/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/:locale(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)/esim',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/:locale(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)/esim/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/faq',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/:locale(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)/faq',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/unlimited/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
      {
        source: '/:locale(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)/unlimited/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
