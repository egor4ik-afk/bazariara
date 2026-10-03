/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ключ eslint убран: Next 16 его не поддерживает (линт при сборке и так не идёт).

  // sharp для оптимизатора картинок: трассировка standalone не видит его нативную
  // libvips (подгружается через dlopen) — без этих файлов /_next/image падает.
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/@img/sharp-linuxmusl-x64/**/*',
      './node_modules/@img/sharp-libvips-linuxmusl-x64/**/*',
    ],
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
    // relaxdev (октябрь 2026): свой `next start`, оптимизация бесплатна и без квот.
    // Только webp: avif жмёт сильнее, но кодируется в разы дольше, а ядро одно.
    formats: ['image/webp'],
    minimumCacheTTL: 2678400, // 31 день
    deviceSizes: [640, 1080, 1920],
    imageSizes: [128, 256],
    qualities: [75],

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

  async redirects() {
    return [
      // hiking / newyear / ikea — ключи не менялись, само-редиректы не нужны.
      // Всё, что вело на удалённые категории, теперь отдаёт 410 через middleware.js.

      // Единственное, что имеет смысл сохранить: старый короткий формат
      // для ЖИВЫХ категорий.
      { source: '/hiking/:id', destination: '/products/hiking/:id', permanent: true },
      { source: '/power/:id',  destination: '/products/power/:id',  permanent: true },
      { source: '/newyear/:id', destination: '/products/newyear/:id', permanent: true },
    ];
  },
};

module.exports = nextConfig;