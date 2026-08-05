/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔴 ФИКС 402 Payment Required на /_next/image  (август 2026)
  //
  // СИМПТОМ:
  //   GET /_next/image?url=...cdn.relaxdev.ru...&w=640&q=75  →  402
  //   Сайт работает, картинки не грузятся, в консоли только этот эндпоинт.
  //
  // ПРИЧИНА:
  //   402 отдаёт оптимизатор картинок Vercel при исчерпании месячной квоты
  //   image transformations. Каждый уникальный (url + w + q) = 1 трансформация.
  //   При 1000+ товарах × 8 дефолтных deviceSizes квота выгорает за дни.
  //
  // РЕШЕНИЕ:
  //   unoptimized: true — картинки идут напрямую с cdn.relaxdev.ru, минуя
  //   /_next/image. CDN И ТАК отдаёт .webp, так что реальная потеря — только
  //   ресайз под конкретный viewport. Компонент <Image> продолжает работать:
  //   lazy-loading, priority, sizes и резервирование места (без CLS) остаются.
  //
  //   КАК ВЕРНУТЬ ОПТИМИЗАЦИЮ (после апгрейда плана или переезда на self-host):
  //   1) удалить строку `unoptimized: true`
  //   2) раскомментировать блок formats + бюджетные настройки ниже
  //   На self-hosted `next start` оптимизация бесплатна и без квот (нужен sharp
  //   — он уже в dependencies).
  // ═══════════════════════════════════════════════════════════════════════════
  images: {
    unoptimized: true,

    // ─── Раскомментировать при возврате к оптимизации ────────────────────────
    // formats: ['image/avif', 'image/webp'],
    //
    // // Бюджетные настройки, чтобы квота снова не выгорела:
    // minimumCacheTTL: 2678400, // 31 день вместо 60 сек по умолчанию
    // deviceSizes: [640, 1080, 1920], // 3 размера вместо 8 дефолтных
    // imageSizes: [128, 256],
    // qualities: [75],
    // ─────────────────────────────────────────────────────────────────────────

    // Оставлено для мгновенного отката: при unoptimized не используется,
    // но обязательно нужно, как только оптимизация включится обратно.
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