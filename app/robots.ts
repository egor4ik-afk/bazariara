import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /admin и /api/ не проходят через locale-middleware — остаются bare.
        // /cart, /checkout, /order-success — проходят и получают /ru|en|ka/ префикс,
        // поэтому disallow даём с wildcard на все три локали.
        disallow: [
          '/admin',
          '/api/',
          '/cart', '/*/cart',
          '/checkout', '/*/checkout',
          '/order-success', '/*/order-success',
        ],
      },
    ],
    sitemap: 'https://bazariara.ge/sitemap.xml',
    host: 'https://bazariara.ge',
  };
}