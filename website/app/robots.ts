import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://lexinoai.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/help',
          '/terms',
          '/privacy',
          '/login',
          '/signup',
        ],
        disallow: [
          '/api/',
          '/api/v1/',
          '/console/',
          '/chat/',
          '/account/',
          '/settings/',
          '/admin/',
          '/lexino-owner-panel-x7a91/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/pricing',
          '/help',
          '/terms',
          '/privacy',
          '/login',
          '/signup',
        ],
        disallow: [
          '/api/',
          '/api/v1/',
          '/console/',
          '/chat/',
          '/account/',
          '/settings/',
          '/admin/',
          '/lexino-owner-panel-x7a91/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
