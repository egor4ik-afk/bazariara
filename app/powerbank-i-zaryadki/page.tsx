import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/app/actions';
import ProductCard from '@/components/ProductCard';

const PATH = '/powerbank-i-zaryadki';

const COPY = {
  ru: {
    title: 'Powerbank и зарядки в Тбилиси купить с доставкой | BAZARI ARA',
    description: 'Портативные аккумуляторы (powerbank) и кабели для зарядки в Тбилиси с доставкой за 2 часа. Заряд для смартфона, наушников и других USB-устройств в дороге.',
    h1: 'Powerbank и зарядки в Тбилиси',
    intro: 'Нужен запас энергии в дороге, в горах или просто когда розетки нет рядом? В BAZARI ARA есть портативные аккумуляторы разной ёмкости и кабели для зарядки смартфонов, наушников и других USB-устройств. Доставка по Тбилиси — 2 часа.',
    powerbanks: 'Портативные аккумуляторы',
    cables: 'Кабели и зарядные устройства',
    all: 'Весь каталог «Powerbank и аксессуары»',
    empty: 'Пока нет товаров в этом разделе — загляните в общий каталог ниже.',
  },
  en: {
    title: 'Power Banks & Chargers in Tbilisi — Buy with Delivery | BAZARI ARA',
    description: 'Portable power banks and charging cables in Tbilisi with 2-hour delivery. Keep your phone, headphones and other USB devices charged on the go.',
    h1: 'Power Banks & Chargers in Tbilisi',
    intro: 'Need extra power on the road, in the mountains, or when there is no outlet nearby? BAZARI ARA has portable power banks of various capacities and charging cables for smartphones, headphones and other USB devices. Delivery across Tbilisi in 2 hours.',
    powerbanks: 'Portable Power Banks',
    cables: 'Cables & Chargers',
    all: 'Full "Power Banks & Accessories" catalog',
    empty: 'No items in this section yet — check the full catalog below.',
  },
  ka: {
    title: 'Powerbank და დამტენები თბილისში მიწოდებით | BAZARI ARA',
    description: 'პორტატული დამტენები (powerbank) და დამტენი კაბელები თბილისში მიწოდებით 2 საათში.',
    h1: 'Powerbank და დამტენები თბილისში',
    intro: 'გჭირდებათ დამატებითი ენერგია გზაში ან როცა როზეტი ახლოს არ არის? BAZARI ARA-ში იპოვით სხვადასხვა ტევადობის პორტატულ დამტენებსა და კაბელებს სმარტფონებისთვის, ყურსასმენებისა და სხვა USB მოწყობილობებისთვის. მიწოდება თბილისში — 2 საათში.',
    powerbanks: 'პორტატული დამტენები',
    cables: 'კაბელები და დამტენები',
    all: 'სრული კატალოგი «Powerbank და აქსესუარები»',
    empty: 'ამ განყოფილებაში ჯერ პროდუქტები არ არის — იხილეთ სრული კატალოგი ქვემოთ.',
  },
} as const;

type Locale = keyof typeof COPY;

function getLocale(hdrs: Headers): Locale {
  const l = hdrs.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];
  const url = `https://bazariara.ge/${locale}${PATH}`;

  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: url,
      languages: {
        ru: `https://bazariara.ge/ru${PATH}`,
        en: `https://bazariara.ge/en${PATH}`,
        ka: `https://bazariara.ge/ka${PATH}`,
        'x-default': `https://bazariara.ge/ru${PATH}`,
      },
    },
    openGraph: {
      locale: locale === 'en' ? 'en_US' : locale === 'ka' ? 'ka_GE' : 'ru_GE',
      url,
      siteName: 'BAZARI ARA',
      type: 'website',
      title: c.title,
      description: c.description,
    },
  };
}

export const revalidate = 600;

export default async function PowerbanksPage() {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];

  const [powerbanks, cables, all] = await Promise.all([
    getProducts('power', 'all', locale === 'ru' ? 'аккумулятор' : 'power bank', 1),
    getProducts('power', 'all', locale === 'ru' ? 'кабел' : 'cable', 1),
    getProducts('power', 'all', '', 1),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c.h1,
    description: c.description,
    url: `https://bazariara.ge/${locale}${PATH}`,
  };

  const grid = (products: typeof all.products) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} index={0} />
      ))}
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-100">{c.h1}</h1>
        <p className="text-gray-300 leading-relaxed mb-10 max-w-3xl">{c.intro}</p>

        {powerbanks.products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">{c.powerbanks}</h2>
            {grid(powerbanks.products)}
          </section>
        )}

        {cables.products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">{c.cables}</h2>
            {grid(cables.products)}
          </section>
        )}

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-100">{c.all}</h2>
            <Link
              href={`/${locale}/?category=power`}
              className="text-lime-400 hover:text-lime-300 text-sm underline whitespace-nowrap"
            >
              {c.all} →
            </Link>
          </div>
          {all.products.length === 0 ? (
            <p className="text-gray-400">{c.empty}</p>
          ) : (
            grid(all.products)
          )}
        </section>
      </main>
    </div>
  );
}