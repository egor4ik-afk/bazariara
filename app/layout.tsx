import { Metadata, Viewport } from 'next'
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

export const viewport: Viewport = {
  themeColor: '#1a202c',
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
    // ИСПРАВЛЕНО: убран хардкод lang="ru", язык теперь управляется через LanguageContext
    // и устанавливается на клиенте через useEffect в LanguageContext
    // Для SSR и SEO оставляем "ru" как основной язык сайта (большинство контента на русском)
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
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
      </body>
    </html>
  )
}