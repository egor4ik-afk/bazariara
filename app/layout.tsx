import { Metadata, Viewport } from 'next'
import './globals.css'
import { CartProvider } from '@/contexts/CartContext'
import { OrderProvider } from '@/contexts/OrderContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider, themeInitScript } from '@/contexts/ThemeContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Script from 'next/script'
// import { FacebookPixelEvents } from '@/components/FacebookPixelEvents' // Закомментировали импорт пикселя

const siteName = 'BAZARI ARA'
const siteUrl = new URL('https://bazariara.ge')
const description =
  'Товары для дома, сада, туризма и детей в Тбилиси. Доставка за 2 часа по городу. Более 1000 товаров по доступным ценам — заказывайте онлайн!'

export const viewport: Viewport = {
  // Значение по умолчанию для светлой темы; ThemeProvider подменяет его
  // на лету при переключении, иначе на мобильных над шапкой остаётся
  // полоса чужого цвета.
  themeColor: '#F8F9F4',
}

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
    googleBot: { index: true, follow: true },
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
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#1a202c',
  },
}

// JSON-LD разметка для всего сайта (WebSite + Organization)
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://bazariara.ge/#website',
      url: 'https://bazariara.ge',
      name: 'BAZARI ARA',
      description,
      inLanguage: ['ru', 'ka', 'en'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://bazariara.ge/?search={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://bazariara.ge/#organization',
      name: 'BAZARI ARA',
      url: 'https://bazariara.ge',
      logo: {
        '@type': 'ImageObject',
        url: 'https://bazariara.ge/android-chrome-512x512.png',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+995591017495',
        contactType: 'customer service',
        availableLanguage: ['Russian', 'Georgian'],
        areaServed: 'GE',
      },
      sameAs: ['https://t.me/bazariarage'],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Тбилиси',
        addressCountry: 'GE',
      },
    },
    {
      '@type': 'LocalBusiness',
      '@id': 'https://bazariara.ge/#localbusiness',
      name: 'BAZARI ARA',
      url: 'https://bazariara.ge',
      description,
      currenciesAccepted: 'GEL',
      priceRange: '₾₾',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Тбилиси',
        addressCountry: 'GE',
      },
      telephone: '+995591017495',
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday',
          'Friday', 'Saturday', 'Sunday',
        ],
        opens: '09:00',
        closes: '21:00',
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Ставит класс темы до первой отрисовки. Без этого страница
            моргает светлым, пока грузится React. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <ThemeProvider>
        <LanguageProvider>
          <OrderProvider>
            <CartProvider>
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </CartProvider>
          </OrderProvider>
        </LanguageProvider>
        </ThemeProvider>

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
        {/* Yandex Metrika */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=107711719','ym');
    ym(107711719,'init',{
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true
    });
  `}
        </Script>
        <noscript>
          <img
            src="https://mc.yandex.ru/watch/107711719"
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </noscript>
        
        {/* Facebook Pixel Script (ЗАКОММЕНТИРОВАНО) */}
        {/* 
        <Script id="fb-pixel-base" strategy="afterInteractive">
          {\`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '\${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
            fbq('track', 'PageView');
          \`}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={"https://www.facebook.com/tr?id=" + process.env.NEXT_PUBLIC_FB_PIXEL_ID + "&ev=PageView&noscript=1"}
            alt=""
          />
        </noscript>
        <FacebookPixelEvents />
        */}

      </body>
    </html>
  )
}