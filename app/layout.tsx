
import { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Script from 'next/script';

const siteName = 'BAZARI ARA';
const siteUrl = new URL('https://bazariara.ge');
const description = 'Все для дома, дачи и отдыха с быстрой доставкой по Тбилиси. У нас вы найдете широкий ассортимент товаров по доступным ценам.';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    // Русский
    'товары для дома', 'мебель', 'мягкая мебель', 'кухонная мебель', 'детская мебель',
    'офисная мебель', 'мебель под заказ', 'шкафы', 'столы', 'стулья', 'диваны', 'кровати',
    'сад и огород', 'садовая техника', 'инструменты для сада', 'растения', 'семена', 'цветы',
    'горшки для растений', 'садовые аксессуары', 'грядки', 'удобрения', 'туризм', 'отдых',
    'пляжный отдых', 'семейный отдых', 'походы', 'кемпинг', 'палатки', 'спальные мешки',
    'туристические рюкзаки', 'туристическое снаряжение', 'игрушки', 'мягкие игрушки',
    'конструкторы', 'развивающие игрушки', 'настольные игры', 'строительные инструменты',
    'электроинструменты', 'ручные инструменты', 'инструменты для ремонта', 'дрели', 'шуруповерты',
    'газ', 'баллоны газа', 'газовое оборудование', 'термобелье', 'термос', 'дождевик',
    'доставка Тбилиси', 'онлайн заказ', 'быстрая доставка', 'доставка по Грузии', 'BAZARI ARA',
    'онлайн магазин', 'купить мебель Тбилиси', 'купить игрушки Тбилиси', 'купить инструменты Тбилиси',
    'садовый магазин Тбилиси', 'туристические товары Тбилиси', 'аксессуары для дома', 'декор для дома',
    'освещение', 'ковры', 'текстиль', 'подушки', 'занавески', 'кухонные принадлежности',
    'посуда', 'бытовая техника', 'очистка и уборка', 'интерьер',
  
    // English
    'home goods', 'furniture', 'sofa', 'kitchen furniture', 'kids furniture', 'office furniture',
    'custom furniture', 'wardrobes', 'tables', 'chairs', 'beds', 'garden and yard', 'garden tools',
    'plants', 'seeds', 'flowers', 'flower pots', 'garden accessories', 'raised beds', 'fertilizers',
    'tourism', 'vacation', 'beach vacation', 'family vacation', 'hiking', 'camping', 'tents',
    'sleeping bags', 'backpacks', 'tourist gear', 'toys', 'soft toys', 'construction toys',
    'educational toys', 'board games', 'construction tools', 'power tools', 'hand tools', 'repair tools',
    'drills', 'screwdrivers', 'gas', 'gas cylinders', 'gas equipment', 'thermal underwear', 'thermos', 'raincoat',
    'Tbilisi delivery', 'online order', 'fast delivery', 'delivery in Georgia', 'BAZARI ARA', 'online store',
    'buy furniture Tbilisi', 'buy toys Tbilisi', 'buy tools Tbilisi', 'garden store Tbilisi',
    'tourist goods Tbilisi', 'home accessories', 'home decor', 'lighting', 'carpets', 'textiles',
    'pillows', 'curtains', 'kitchen utensils', 'tableware', 'appliances', 'cleaning', 'painting supplies',
    'interior design'
  ],  
  
  // --- Иконки через Metadata API ---
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
    title: { default: siteName, template: `%s | ${siteName}` },
    description,
    images: [
      {
        url: new URL('/web-app-manifest-512x512.png', siteUrl).toString(),
        width: 512,
        height: 512,
        alt: 'Логотип BAZARI ARA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
  
  // --- Для Windows плиток и темы ---
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#1a202c',
    'theme-color': '#1a202c',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EN4C3S417X"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-EN4C3S417X');
          `}
        </Script>
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
        <Analytics />
      </body>
    </html>
  );
}
