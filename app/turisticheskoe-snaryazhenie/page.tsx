import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/app/actions';
import ProductCard from '@/components/ProductCard';

const PATH = '/turisticheskoe-snaryazhenie';

const COPY = {
  ru: {
    title: 'Где купить туристическое снаряжение в Тбилиси — стулья, палатки, баллоны, горелки, дрова | BAZARI ARA',
    description: 'Туристическое снаряжение в Тбилиси с доставкой за 2 часа: складные стулья и столы, палатки, газовые баллоны, горелки, дрова и розжиг для похода и отдыха на природе.',
    h1: 'Туристическое снаряжение в Тбилиси',
    intro: 'Собираетесь в поход, на пикник или в горы рядом с Тбилиси? В BAZARI ARA есть всё для активного отдыха: складные туристические стулья и столы, палатки на любой сезон, газовые баллоны и горелки для готовки на природе, дрова и розжиг для костра. Доставка по Тбилиси — 2 часа.',
    tents: 'Палатки',
    chairs: 'Туристическая мебель: стулья и столы',
    burners: 'Газовые баллоны и горелки',
    firewood: 'Дрова и розжиг',
    all: 'Весь каталог «Туризм и отдых»',
    empty: 'Пока нет товаров в этом разделе — загляните в общий каталог туризма ниже.',
  },
  en: {
    title: 'Camping & Hiking Gear in Tbilisi — Chairs, Tents, Gas Canisters, Burners, Firewood | BAZARI ARA',
    description: 'Camping and hiking gear in Tbilisi with 2-hour delivery: folding chairs and tables, tents, gas canisters, burners, firewood and fire starters.',
    h1: 'Camping & Hiking Gear in Tbilisi',
    intro: 'Heading to the mountains near Tbilisi? BAZARI ARA has everything for outdoor trips: folding camp chairs and tables, tents for any season, gas canisters and burners for cooking outdoors, firewood and fire starters. Delivery across Tbilisi in 2 hours.',
    tents: 'Tents',
    chairs: 'Camp furniture: chairs & tables',
    burners: 'Gas canisters & burners',
    firewood: 'Firewood & fire starters',
    all: 'Full "Tourism & Camping" catalog',
    empty: 'No items in this section yet — check the full tourism catalog below.',
  },
  ka: {
    title: 'ტურისტული აღჭურვილობა თბილისში — სკამები, კარვები, ბალონები, გამათბობლები, შეშა | BAZARI ARA',
    description: 'ტურისტული აღჭურვილობა თბილისში მიწოდებით 2 საათში: დასაკეცი სკამები და მაგიდები, კარვები, გაზის ბალონები, გამათბობლები, შეშა.',
    h1: 'ტურისტული აღჭურვილობა თბილისში',
    intro: 'მიდიხართ ლაშქრობაში ან პიკნიკზე თბილისის მიმდებარედ? BAZARI ARA-ში იპოვით ყველაფერს: დასაკეც სკამებსა და მაგიდებს, კარვებს, გაზის ბალონებსა და გამათბობლებს, შეშას. მიწოდება თბილისში — 2 საათში.',
    tents: 'კარვები',
    chairs: 'ტურისტული ავეჯი: სკამები და მაგიდები',
    burners: 'გაზის ბალონები და გამათბობლები',
    firewood: 'შეშა',
    all: 'სრული კატალოგი «ტურიზმი»',
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

export default async function TourismGearPage() {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];

  const [tents, chairs, burnersA, burnersB, firewood, all] = await Promise.all([
    getProducts('hiking', 'all', locale === 'ru' ? 'палатк' : 'tent', 1),
    getProducts('hiking', 'all', locale === 'ru' ? 'стул' : 'chair', 1),
    getProducts('hiking', 'all', locale === 'ru' ? 'горелк' : 'burner', 1),
    getProducts('hiking', 'all', locale === 'ru' ? 'баллон' : 'canister', 1),
    getProducts('hiking', 'all', locale === 'ru' ? 'дров' : 'firewood', 1),
    getProducts('hiking', 'all', '', 1),
  ]);

  const burnerMap = new Map([...burnersA.products, ...burnersB.products].map((p) => [p.id, p]));
  const burners = Array.from(burnerMap.values());

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

        {tents.products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">{c.tents}</h2>
            {grid(tents.products)}
          </section>
        )}

        {chairs.products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">{c.chairs}</h2>
            {grid(chairs.products)}
          </section>
        )}

        {burners.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">{c.burners}</h2>
            {grid(burners)}
          </section>
        )}

        {firewood.products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">{c.firewood}</h2>
            {grid(firewood.products)}
          </section>
        )}

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-100">{c.all}</h2>
            <Link
              href={`/${locale}/?category=hiking`}
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