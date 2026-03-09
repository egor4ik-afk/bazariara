/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Разрешаем загрузку и оптимизацию изображений с любых HTTPS-доменов
        protocol: 'https',
        hostname: '**', 
      },
    ],
  },
};

module.exports = nextConfig;
