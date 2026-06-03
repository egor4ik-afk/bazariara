import type { Metadata } from 'next';
import Link from 'next/link';
import InteractiveFilters from '@/components/InteractiveFilters';
import ProductCard from '@/components/ProductCard';
import HomeHeader from '@/components/HomeHeader';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { getCategories, getSubCategories, getProducts } from './actions';

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category;
  const subcategory = params.subcategory;
  const page = parseInt(params.page || '1', 10);

  // ✅ ИСПРАВЛЕНО: страница 1 не добавляет page в canonical (избегаем дублей)
  const pageStr = page > 1 ? ` — страница ${page}` : '';

  const canonicalParams = new URLSearchParams();
  if (category && category !== 'all') canonicalParams.set('category', category);
  if (subcategory && subcategory !== 'all') canonicalParams.set('subcategory', subcategory);
  // НЕ добавляем page=1 в canonical
  if (page > 1) canonicalParams.set('page', String(page));
  const canonicalQuery = canonicalParams.toString();
  const canonical = `https://bazariara.ge/${canonicalQuery ? '?' + canonicalQuery : ''}`;

  // ✅ Сайт однояыычный (ru). Hreflang убираем — Google разберётся сам.
  // Если в будущем добавите грузинскую версию (/ka/...), раскомментируйте и
  // пропишите реальные URL для каждого языка.
  const alternates = {
    canonical,
    // languages: {
    //   'ru': `https://bazariara.ge/${canonicalQuery ? '?' + canonicalQuery : ''}`,
    //   'ka': `https://bazariara.ge/ka/${canonicalQuery ? '?' + canonicalQuery : ''}`,
    //   'x-default': `https://bazariara.ge/${canonicalQuery ? '?' + canonicalQuery : ''}`,
    // },
  };

  if (!category || category === 'all') {
    return {
      title: `BAZARI ARA: Товары для дома, сада, туризма и отдыха в Тбилиси${pageStr}`,
      description: 'Товары для дома, сада, туризма и детей в Тбилиси. Доставка за 2 часа по городу. Более 1000 товаров по доступным ценам — заказывайте онлайн!',
      alternates,
    };
  }

  const categories = await getCategories();
  const cat = categories.find(c => c.key === category);
  const catName = cat ? cat.name : category;

  if (subcategory && subcategory !== 'all') {
    const subName = subcategory.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      title: `${subName} — ${catName} | купить в Тбилиси | BAZARI ARA${pageStr}`,
      description: `${subName} в категории «${catName}». Быстрая доставка по Тбилиси за 2 часа.`,
      alternates,
    };
  }

  return {
    title: `${catName} — купить в Тбилиси с доставкой за 2 часа | BAZARI ARA${pageStr}`,
    description: `Большой выбор товаров «${catName}» в Тбилиси. Заказывайте онлайн — доставим за 2 часа.`,
    alternates,
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const selectedCategory    = params.category || 'all';
  const selectedSubCategory = params.subcategory || 'all';
  const searchQuery         = params.search || '';
  const currentPage         = parseInt(params.page || '1', 10);
  const ITEMS_PER_PAGE      = 20;

  const categoriesList    = await getCategories();
  const subCategoriesList = await getSubCategories(selectedCategory);
  const { products, total } = await getProducts(selectedCategory, selectedSubCategory, searchQuery, currentPage);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const buildPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (selectedCategory !== 'all') p.set('category', selectedCategory);
    if (selectedSubCategory !== 'all') p.set('subcategory', selectedSubCategory);
    if (searchQuery) p.set('search', searchQuery);
    if (pageNumber > 1) p.set('page', pageNumber.toString());
    const qs = p.toString();
    return `/${qs ? '?' + qs : ''}`;
  };

  // ✅ JSON-LD ItemList — помогает Google показывать товары прямо в поиске
  const isHomePage = selectedCategory === 'all' && selectedSubCategory === 'all' && !searchQuery;
  const itemListJsonLd = isHomePage && products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Товары BAZARI ARA',
    description: 'Товары для дома, сада, туризма и отдыха в Тбилиси',
    numberOfItems: total,
    itemListElement: products.slice(0, 10).map((product, index) => {
      const catKey = (product as any).category_key
        || (product.external_id ? product.external_id.split('_')[0] : 'unknown');
      return {
        '@type': 'ListItem',
        position: (currentPage - 1) * ITEMS_PER_PAGE + index + 1,
        item: {
          '@type': 'Product',
          name: product.name_ru || product.name_en || product.name_ka || product.name,
          url: `https://bazariara.ge/products/${catKey}/${product.id}`,
          image: product.image_url || undefined,
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'GEL',
            availability: product.in_stock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        },
      };
    }),
  } : null;

  // ✅ BreadcrumbList для категорийных страниц
  const breadcrumbJsonLd = selectedCategory !== 'all' ? (() => {
    const cat = categoriesList.find(c => c.key === selectedCategory);
    const catName = cat?.name || selectedCategory;
    const items: object[] = [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://bazariara.ge/' },
      { '@type': 'ListItem', position: 2, name: catName, item: `https://bazariara.ge/?category=${selectedCategory}` },
    ];
    if (selectedSubCategory !== 'all') {
      const subName = selectedSubCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      items.push({
        '@type': 'ListItem',
        position: 3,
        name: subName,
        item: `https://bazariara.ge/?category=${selectedCategory}&subcategory=${selectedSubCategory}`,
      });
    }
    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
  })() : null;

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      {/* JSON-LD блоки */}
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}

      <div className="container mx-auto px-4 py-1 sm:px-6 lg:px-8">
        <HomeHeader
          categoryNames={selectedCategory !== 'all'
            ? (() => {
                const cat = categoriesList.find(c => c.key === selectedCategory);
                return cat ? { ru: cat.name, en: cat.name_en, ka: cat.name_ka } : undefined;
              })()
            : undefined}
          currentPage={currentPage}
        />

        <InteractiveFilters
          categories={categoriesList}
          subCategories={subCategoriesList}
          selectedCategory={selectedCategory}
          selectedSubCategory={selectedSubCategory}
        />

        {/* ✅ aria-label добавлен для семантики */}
        <section aria-label="Список товаров">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Пустой результат поиска */}
          {products.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl">Товары не найдены</p>
              <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <nav aria-label="Пагинация" className="mt-16 flex justify-center items-center gap-4">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                aria-label="Предыдущая страница"
                className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all shadow-lg hover:scale-105"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-gray-700 opacity-50 cursor-not-allowed" aria-disabled="true">
                <ChevronLeftIcon className="h-6 w-6" />
              </div>
            )}
            <span className="text-lg font-semibold text-white bg-gray-800/80 rounded-full px-5 py-2">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                aria-label="Следующая страница"
                className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all shadow-lg hover:scale-105"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-gray-700 opacity-50 cursor-not-allowed" aria-disabled="true">
                <ChevronRightIcon className="h-6 w-6" />
              </div>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
