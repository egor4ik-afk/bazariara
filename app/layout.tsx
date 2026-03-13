import { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Script from 'next/script';

const siteName = 'BAZARI ARA';
const siteUrl = new URL('https://bazariara.ge');
const description = 'Товары для дома, сада, туризма и детей в Тбилиси. Доставка за 2 часа по городу. Более 1000 товаров по доступным ценам — заказывайте онлайн!';

export const metadata: Metadata = {
  metadataBase: siteUrl,

  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description,

  // 🔹 Запрещаем индексацию технических страниц через robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon_120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },

  openGraph: {
    type: 'website',
    url: siteUrl.toString(),
    siteName,
    description,
    locale: 'ru_GE',
    images: [
      {
        // 🔹 1200×630 — стандартный размер для превью в соцсетях и мессенджерах
        url: new URL('/og-image.png', siteUrl).toString(),
        width: 1200,
        height: 630,
        alt: 'BAZARI ARA — доставка товаров по Тбилиси за 2 часа',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@bazariara', // 🔹 замените на реальный Twitter/X аккаунт или удалите строку
  },

  themeColor: '#1a202c',
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#1a202c',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="flex flex-col min-h-screen">
        <LanguageProvider>
          <OrderProvider>
            <CartProvider>
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </CartProvider>
          </OrderProvider>
        </LanguageProvider>

        {/* 🔹 Все метрики грузятся через 3 секунды — не блокируют LCP и FID.
            afterInteractive ждёт гидрации, затем setTimeout даёт странице
            полностью отрисоваться перед загрузкой сторонних скриптов. */}
        <Script id="delayed-analytics" strategy="afterInteractive">
          {`
            setTimeout(function() {
              // — Google Analytics —
              var gaScript = document.createElement('script');
              gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-EN4C3S417X';
              gaScript.async = true;
              document.head.appendChild(gaScript);

              gaScript.onload = function() {
                window.dataLayer = window.dataLayer || [];
                function gtag(){ window.dataLayer.push(arguments); }
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', 'G-EN4C3S417X');
              };

              // — Vercel Analytics —
              var vaScript = document.createElement('script');
              vaScript.src = '/_vercel/insights/script.js';
              vaScript.defer = true;
              document.head.appendChild(vaScript);
            }, 3000);
          `}
        </Script>
      </body>
    </html>
  );
}
