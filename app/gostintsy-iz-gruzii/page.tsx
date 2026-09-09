import { PrismaClient } from '@prisma/client';
import ProductCard from '@/components/ProductCard';
import { unstable_setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { Metadata, ResolvingMetadata } from 'next';


const prisma = new PrismaClient();


// Генерация метаданных для страницы
type Props = {
  params: { locale: string };
};
export async function generateMetadata({ params: { locale } }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const t = (await import(`@/messages/${locale}.json`)).default;
  return {
    title: t.gostintsy.meta_title,
    description: t.gostintsy.meta_description,
  };
}


// Получение данных для конкретной категории и подкатегории
async function getProducts(category: string, subcategory?: string, take: number = 20) {
  let where: any = {
    category_key: category,
    in_stock: true,
    price: { not: null },
    name: { not: '' },
  };
  if (subcategory) {
    where.sub_category_key = subcategory;
  }

  const products = await prisma.product.findMany({
    where,
    take,
    orderBy: { created_at: 'desc' },
  });

  const total = await prisma.product.count({ where });

  return {
    products: products as any[],
    total,
  };
}

export default async function GeorgianGiftsPage() {
  // TODO: `unstable_setRequestLocale` unnecessary here, cause we don't have a dynamic route
  // unstable_setRequestLocale(locale);
  const locale = 'ru'; // TODO
  const c = useTranslations('gostintsy');

  const honey    = await getProducts('gifts', 'med', 4);
  const sweets   = await getProducts('gifts', 'churchhelaipastila', 8);
  const spices   = await getProducts('gifts', 'specii', 4);
  const tea      = await getProducts('gifts', 'chay', 4);
  const jam      = await getProducts('gifts', 'varenye', 4);
  const cheese   = await getProducts('gifts', 'cheese', 4);
  const sauces   = await getProducts('gifts', 'sousy', 4);
  const drinks   = await getProducts('gifts', 'lemonade', 4);
  const alcohol  = await getProducts('gifts', 'wine', 8);
  const cards    = await getProducts('gifts', 'otkrytki', 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c('h1'),
    description: c('intro'),
    url: `https://bazari-ara.com/${locale}/gostintsy-iz-gruzii`,
    inLanguage: locale,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        ...honey.products.map((p, i) => ({ '@type': 'Product', name: p.name, position: i + 1 })),
        ...sweets.products.map((p, i) => ({ '@type': 'Product', name: p.name, position: i + 1 + honey.products.length })),
      ],
    },
  };

  // Grid для товаров
  const grid = (products: any[]) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {products.map((product, idx) => (
        <ProductCard key={product.id} product={product} index={idx} />
      ))}
    </div>
  );

  // Секция
  const section = (
    title: string,
    text: string,
    data: { products: any[]; total: number },
    categoryKey: string,
  ) => (
    <section className="mb-12">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
        <h2 className="text-2xl font-bold text-ink-900">{title}</h2>
        <Link
          href={`/${locale}/?category=${categoryKey}`}
          className="text-brand-700 hover:text-brand-600 text-sm underline whitespace-nowrap"
        >
          {title} →
        </Link>
      </div>
      <p className="text-ink-700 leading-relaxed mb-5 max-w-3xl">{text}</p>
      {data.products.length === 0 ? (
        <p className="text-ink-500 text-sm">{c.empty}</p>
      ) : (
        grid(data.products)
      )}
    </section>
  );

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-5 text-ink-900">{c.h1}</h1>
        <p className="text-ink-700 leading-relaxed mb-4 max-w-3xl">{c.intro}</p>
        <p className="text-ink-700 leading-relaxed mb-10 max-w-3xl">{c.intro2}</p>

        {section(c.honey,  c.honeyText,  honey,  'med')}
        {section(c.sweets, c.sweetsText, sweets, 'churchhelaipastila')}
        {section(c.jam,    c.jamText,    jam,    'varenye')}
        {section(c.spices, c.spicesText, spices, 'specii')}
        {section(c.cheese, c.cheeseText, cheese, 'cheese')}
        {section(c.sauces, c.saucesText, sauces, 'sousy')}
        {section(c.drinks, c.drinksText, drinks, 'lemonade')}
        {section(c.tea,    c.teaText,    tea,    'chay')}
        {section(c.alcohol,c.alcoholText,alcohol,'wine')}
        {section(c.cards,  c.cardsText,  cards,  'otkrytki')}

        <section className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-bold text-ink-900 mb-5">{c.faqTitle}</h2>
          <div className="space-y-5">
            {c.faq.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold text-ink-900 mb-1.5">{f.q}</h3>
                <p className="text-ink-600 leading-relaxed text-sm">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
