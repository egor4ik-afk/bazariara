/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ключ eslint убран: Next 16 его не поддерживает (линт при сборке и так не идёт).

  experimental: {
    // Встраивание CSS в HTML выключено (было true).
    // Next вписывал стили (~41 КБ) в каждую страницу трижды: в <style> и
    // дважды в данные React — второй раз для страницы ошибки. HTML главной
    // весил 185 КБ (42 КБ в gzip), без встраивания — 64 КБ (18 КБ в gzip).
    // Файл стилей (12 КБ в gzip) скачивается один раз и дальше берётся из кэша.
    // Цена: при самом первом заходе браузер ждёт этот файл перед отрисовкой —
    // PageSpeed может снять балл-два. Вернуть: inlineCss: true.
    inlineCss: false,
  },

  // undici — HTTP-клиент для запросов к Telegram через прокси (lib/telegram.ts).
  // Не бандлим: берётся из node_modules как есть.
  serverExternalPackages: ['undici'],

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
    imageSizes: [128, 256, 384],
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

  // Заголовки безопасности для всех ответов. На Vercel часть из них ставил
  // vercel.json, при переезде на relaxdev они пропали.
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        // Только HTTPS в течение года, в том числе на поддоменах. preload не ставим:
        // попадание в список браузеров потом очень трудно отменить.
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        // Чужая вкладка, открытая с сайта, не получит доступ к нашему окну и наоборот.
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        // Запрет показа сайта в чужом iframe (X-Frame-Options / frame-ancestors) не
        // включён: в истории репозитория сайт встраивали в другие проекты.
      ],
    }];
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