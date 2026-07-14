/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Оптимизация включена: Next.js сам ресайзит и переупаковывает в
    // AVIF/WebP под устройство запрашивающего, независимо от того, что
    // CDN уже отдаёт .webp — это даёт дополнительный ресайз под конкретный
    // viewport (у CDN всегда фиксированный размер, у Next.js — по sizes).
    formats: ['image/avif', 'image/webp'],
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

  // ✅ SEO ПАТЧ #3 — финальная версия: 301-редиректы для 631 страниц с 404
  //
  // ИСТОРИЯ МИГРАЦИЙ:
  //   v1: /furniture/43           (короткий формат без /products/)
  //   v2: /products/furniture/43  (добавлен префикс /products/)
  //   v3: /products/mebel/43      (EN → RU ключи категорий) — ТЕКУЩИЙ
  //
  // СТРУКТУРА:
  //   Этап 1 — v1 → v3: /:old_en/:id            → /products/:new_ru/:id
  //   Этап 2 — v2 → v3: /products/:old_en/:id   → /products/:new_ru/:id
  //
  // ВАЖНО: Этап 1 должен идти РАНЬШЕ Этапа 2 — Next.js применяет правила
  // сверху вниз и останавливается на первом совпадении.
  //
  // Само-редиректы (source === destination) специально исключены:
  // /products/hiking, /products/newyear, /products/ikea — ключи не менялись,
  // редирект не нужен. Если Googlebot заходит на уже правильный URL — 200 OK.

  async redirects() {
    return [

      // ═══════════════════════════════════════════════════════════════════════
      // ЭТАП 1 — старый короткий формат (без /products/)
      // v1: /:category/:id  →  v3: /products/:newcategory/:id
      // ═══════════════════════════════════════════════════════════════════════

      { source: '/furniture/:id',  destination: '/products/mebel/:id',                     permanent: true },
      { source: '/garden/:id',     destination: '/products/sad/:id',                        permanent: true },
      { source: '/plumbing/:id',   destination: '/products/santehnika/:id',                 permanent: true },
      { source: '/lighting/:id',   destination: '/products/osveschenie/:id',                permanent: true },
      { source: '/climate/:id',    destination: '/products/klimaticheskoeoborudovanie/:id', permanent: true },
      { source: '/hiking/:id',     destination: '/products/hiking/:id',                     permanent: true },
      { source: '/newyear/:id',    destination: '/products/newyear/:id',                    permanent: true },
      { source: '/ikea/:id',       destination: '/products/ikea/:id',                       permanent: true },
      // ═══════════════════════════════════════════════════════════════════════
      // ЭТАП 2 — формат /products/ с EN-ключами (само-редиректы исключены)
      // v2: /products/:old_en/:id  →  v3: /products/:new_ru/:id
      // ═══════════════════════════════════════════════════════════════════════

      { source: '/products/furniture/:id', destination: '/products/mebel/:id',                     permanent: true },
      { source: '/products/garden/:id',    destination: '/products/sad/:id',                        permanent: true },
      { source: '/products/plumbing/:id',  destination: '/products/santehnika/:id',                 permanent: true },
      { source: '/products/lighting/:id',  destination: '/products/osveschenie/:id',                permanent: true },
      { source: '/products/climate/:id',   destination: '/products/klimaticheskoeoborudovanie/:id', permanent: true },
      // /products/kids/:id → реальный RU-ключ (если была такая категория)
      { source: '/products/kids/:id',      destination: '/products/deti/:id',                       permanent: true },

      // hiking / newyear / ikea — ключи не менялись, само-редиректы не нужны
      // (Googlebot получит 200 на правильном URL)

    ];
  },
};

module.exports = nextConfig;