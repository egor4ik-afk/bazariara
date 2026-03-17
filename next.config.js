/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },

      // Vercel Blob
      { protocol: 'https', hostname: '*.vercel-storage.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },

      // IBB
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '*.ibb.co' },

      // ✅ YANDEX CDN (твоя основа)
      { protocol: 'https', hostname: 'cdn.relaxdev.ru' },

      // ✅ если вдруг используешь прямой доступ к bucket
      { protocol: 'https', hostname: 'storage.yandexcloud.net' },
    ],
  },
};

module.exports = nextConfig;