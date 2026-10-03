import { Metadata, Viewport } from 'next'
import './globals.css'
import { CartProvider } from '@/contexts/CartContext'
import { OrderProvider } from '@/contexts/OrderContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider, themeInitScript } from '@/contexts/ThemeContext'
import { CONTACTS } from '@/lib/contacts'
import Header from '@/components/Header'
import SupportChat from '@/components/SupportChatLazy'
import DeferredAnalytics from '@/components/DeferredAnalytics'
import Footer from '@/components/Footer'
import { headers } from 'next/headers'
import { runtimeEnv } from '@/lib/env'

const siteName = 'BAZARI ARA'
const siteUrl = new URL('https://bazariara.ge')
// Описание по умолчанию — подставляется на страницах без собственного.
// Было «Товары для дома, сада, туризма и детей… Более 1000 товаров»:
// ни дома, ни сада, ни тысячи товаров в каталоге давно нет.
const description =
  'Грузинские продукты от местных производителей: мёд, чай, чурчхела, специи. Подарки из Грузии и товары для путешествий с доставкой по Тбилиси за 2 часа.'

export const viewport: Viewport = {
  // Значение по умолчанию для светлой темы; ThemeProvider подменяет его
  // на лету при переключении, иначе на мобильных над шапкой остаётся
  // полоса чужого цвета.
  themeColor: '#F8F9F4',
}

/**
 * Описание и подпись картинки для соцсетей — на языке страницы.
 * Раньше это была константа: на /en и /ka любая страница без
 * собственного description получала русское.
 */
const DESCRIPTION = {
  ru: description,
  en: 'Georgian food from local producers: honey, tea, churchkhela, spices. Gifts from Georgia and travel gear delivered across Tbilisi in 2 hours.',
  ka: 'ქართული პროდუქცია ადგილობრივი მწარმოებლებისგან: თაფლი, ჩაი, ჩურჩხელა, სანელებლები. საჩუქრები და მოგზაურობის ნივთები, მიწოდება თბილისში.',
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lh = (await headers()).get('x-locale');
  const locale = lh === 'en' || lh === 'ka' ? lh : 'ru';
  const d = DESCRIPTION[locale];
  return {
    ...metadata,
    description: d,
    openGraph: { ...(metadata.openGraph || {}), description: d },
    twitter: { ...(metadata.twitter || {}), description: d },
  };
}

const metadata: Metadata = {
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
        alt: 'BAZARI ARA — грузинские продукты и подарки с доставкой по Тбилиси',
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
          urlTemplate: 'https://bazariara.ge/ru/catalog?search={search_term_string}',
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
        telephone: CONTACTS.phoneE164,
        contactType: 'customer service',
        availableLanguage: ['Russian', 'Georgian'],
        areaServed: 'GE',
      },
      sameAs: [CONTACTS.telegram, CONTACTS.whatsapp],
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
      telephone: CONTACTS.phoneE164,
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

// ID пикселя Meta читается при каждом запросе (страницы и так рендерятся на
// сервере). Через process.env.NEXT_PUBLIC_FB_PIXEL_ID он вшивался при сборке,
// а при сборке вместо него стоит заглушка — пиксель получал ID
// «auto-generated-stub-for-build» и не работал. Нет корректного ID — пиксель
// не ставим вовсе, чтобы не сыпать ошибками в консоль.
function fbPixelId(): string {
  const id = runtimeEnv('NEXT_PUBLIC_FB_PIXEL_ID') || runtimeEnv('FB_PIXEL_ID');
  return /^\d{6,20}$/.test(id) ? id : '';
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Язык документа — по адресу страницы (/ru, /en, /ka). Раньше везде стоял «ru»,
  // и английские страницы для поисковиков и скринридеров выглядели русскими.
  const lh = (await headers()).get('x-locale');
  const lang = lh === 'en' || lh === 'ka' ? lh : 'ru';
  const pixelId = fbPixelId();
  return (
    <html lang={lang} suppressHydrationWarning>
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
              <SupportChat />
            </CartProvider>
          </OrderProvider>
        </LanguageProvider>
        </ThemeProvider>

        {/* Google Analytics, Метрика и пиксель Meta стартуют по первому действию
            посетителя или через 5 секунд — см. components/DeferredAnalytics. */}
        <DeferredAnalytics pixelId={pixelId} />
        <noscript>
          <img
            src="https://mc.yandex.ru/watch/107711719"
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </noscript>
        {pixelId && (
        <>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={"https://www.facebook.com/tr?id=" + pixelId + "&ev=PageView&noscript=1"}
            alt=""
          />
        </noscript>
        </>
        )}

      </body>
    </html>
  )
}
