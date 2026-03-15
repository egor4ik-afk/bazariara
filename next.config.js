/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Предупреждения ESLint не останавливают production build
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: '*.ibb.co',
      },
    ],
  },
};

module.exports = nextConfig;