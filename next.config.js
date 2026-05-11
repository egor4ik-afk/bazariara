/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: '*.vercel-storage.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '*.ibb.co' },
      { protocol: 'https', hostname: 'cdn.relaxdev.ru' },
      { protocol: 'https', hostname: 'storage.yandexcloud.net' },
    ],
  },

  // ✅ SEO ПАТЧ #3: 301-редиректы для 631 страниц с 404
  // Этап 1: старый короткий формат /:category/:id → /products/:newcategory/:id
  // Этап 2: /products/:oldcategory/:id → /products/:newcategory/:id
  async redirects() {
    return [
      // ─── ЭТАП 1: старый формат без /products/ ─────────────────────────────
      {
        source: '/furniture/:id',
        destination: '/products/mebel/:id',
        permanent: true,
      },
      {
        source: '/garden/:id',
        destination: '/products/sad/:id',
        permanent: true,
      },
      {
        source: '/plumbing/:id',
        destination: '/products/santehnika/:id',
        permanent: true,
      },
      {
        source: '/lighting/:id',
        destination: '/products/osveschenie/:id',
        permanent: true,
      },
      {
        source: '/hiking/:id',
        destination: '/products/hiking/:id',
        permanent: true,
      },
      {
        source: '/newyear/:id',
        destination: '/products/newyear/:id',
        permanent: true,
      },
      // Добавьте другие категории если они были (climate, ikea и т.д.):
      {
        source: '/climate/:id',
        destination: '/products/klimaticheskoeoborudovanie/:id',
        permanent: true,
      },
      {
        source: '/ikea/:id',
        destination: '/products/ikea/:id',
        permanent: true,
      },

      // ─── ЭТАП 2: /products/english/:id → /products/russian/:id ───────────
      {
        source: '/products/furniture/:id',
        destination: '/products/mebel/:id',
        permanent: true,
      },
      {
        source: '/products/garden/:id',
        destination: '/products/sad/:id',
        permanent: true,
      },
      {
        source: '/products/plumbing/:id',
        destination: '/products/santehnika/:id',
        permanent: true,
      },
      {
        source: '/products/lighting/:id',
        destination: '/products/osveschenie/:id',
        permanent: true,
      },
      {
        source: '/products/climate/:id',
        destination: '/products/klimaticheskoeoborudovanie/:id',
        permanent: true,
      },
      // /products/osveschenie/:id уже правильный — редирект не нужен
    ];
  },
};

module.exports = nextConfig;
