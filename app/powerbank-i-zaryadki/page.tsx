import { PrismaClient } from '@prisma/client';
import ProductCard from '@/components/ProductCard';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { Metadata } from 'next';

const prisma = new PrismaClient();

// Генерация метаданных для страницы
export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = (await import(`@/messages/${locale}.json`)).default;
  return {
    title: t.powerbanks.meta_title,
    description: t.powerbanks.meta_description,
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

export default async function PowerbanksPage() {
  const locale = 'ru'; // TODO: Get locale dynamically
  const c = useTranslations('powerbanks');

  const powerbanks = await getProducts('power', 'powerbanks', 8);
  const cables = await getProducts('power', 'cables', 8);
  const all = await getProducts('power', undefined, 4);

  const allProductsList = [
    ...powerbanks.products,
    ...cables.products,
    ...all.products,
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c('h1'),
    description: c('intro'),
    url: `https://bazari-ara.com/${locale}/powerbank-i-zaryadki`,
    inLanguage: locale,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: allProductsList.map((p, i) => ({
        '@type': 'Product',
        name: p.name,
        position: i + 1,
      })),
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

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-ink-900">{c.h1}</h1>
        <p className="text-ink-700 leading-relaxed mb-10 max-w-3xl">{c.intro}</p>

        {powerbanks.products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink-900 mb-4">{c.powerbanks}</h2>
            {grid(powerbanks.products)}
          </section>
        )}

        {cables.products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-ink-900 mb-4">{c.cables}</h2>
            {grid(cables.products)}
          </section>
        )}

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-2xl font-bold text-ink-900">{c.all}</h2>
            <Link
              href={`/${locale}/?category=power`}
              className="text-brand-700 hover:text-brand-600 text-sm underline whitespace-nowrap"
            >
              {c.all} →
            </Link>
          </div>
          {all.products.length === 0 ? (
            <p className="text-ink-600">{c.empty}</p>
          ) : (
            grid(all.products)
          )}
        </section>
      </main>
    </div>
  );
}
