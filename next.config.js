/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Отключаем оптимизацию — Vercel берёт деньги за обработку Blob URL
    // через /_next/image. Используем оригинальные URL напрямую.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: '*.vercel-storage.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '*.ibb.co' },
    ],
  },
};

module.exports = nextConfig;