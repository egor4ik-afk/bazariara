import { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/contexts/CartContext'
import { OrderProvider } from '@/contexts/OrderContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Script from 'next/script'

const siteName = 'BAZARI ARA'
const siteUrl = new URL('https://bazariara.ge')
const description =
  'Товары для дома, сада, туризма и детей в Тбилиси. Доставка за 2 часа по городу. Более 1000 товаров по доступным ценам — заказывайте онлайн!'

export const metadata: Metadata = {
  metadataBase: siteUrl,

  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description,

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
        url: new URL('/og-image.png', siteUrl).toString(),
        width: 1200,
        height: 630,
        alt: 'BAZARI ARA — доставка товаров по Тбилиси за 2 часа',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@bazariara',
  },

  themeColor: '#1a202c',
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#1a202c',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

        {/* ───────── Google Analytics ───────── */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EN4C3S417X"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){ window.dataLayer.push(arguments); }
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-EN4C3S417X');
          `}
        </Script>

        {/* ───────── Яндекс.Метрика ───────── */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              k=e.createElement(t),a=e.getElementsByTagName(t)[0];
              k.async=1;k.src=r;
              a.parentNode.insertBefore(k,a);
            })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(107711719, "init", {
              clickmap:true,
              trackLinks:true,
              accurateTrackBounce:true,
              webvisor:true,
              ecommerce:"dataLayer"
            });
          `}
        </Script>

        {/* noscript версия */}
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <noscript>
                <div>
                  <img src="https://mc.yandex.ru/watch/107711719"
                       style="position:absolute; left:-9999px;"
                       alt="" />
                </div>
              </noscript>
            `,
          }}
        />
      </body>
    </html>
  )
}