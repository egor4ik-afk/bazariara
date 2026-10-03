// FILE: components/CatalogView.tsx
//
// Список товаров с фильтрами, поиском и пагинацией. Раньше жил прямо в
// app/page.tsx; теперь его используют две страницы:
//   /{locale}?category=X   — категории (адреса не менялись)
//   /{locale}/catalog       — все товары и поиск
// Главная без параметров — приветственная, см. components/home/Welcome.tsx.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import InteractiveFilters from '@/components/InteractiveFilters';
import ProductCard from '@/components/ProductCard';
import HomeHeader from '@/components/HomeHeader';
import { getCategories, getSubCategories, getProducts } from '@/app/actions';
import { toCardProduct } from '@/lib/types';

type Locale = 'ru' | 'en' | 'ka';

const ALL_PRODUCTS = { ru: 'Все товары', en: 'All products', ka: 'ყველა პროდუქტი' };

export default async function CatalogView({
  locale,
  selectedCategory,
  selectedSubCategory,
  searchQuery,
  currentPage,
  basePath,
}: {
  locale: Locale;
  selectedCategory: string;
  selectedSubCategory: string;
  searchQuery: string;
  currentPage: number;
  /** '' — категории на главном адресе, '/catalog' — общий список. */
  basePath: '' | '/catalog';
}) {
  const ITEMS_PER_PAGE = 20;

  const categoriesList    = await getCategories();

  if (selectedCategory !== 'all' && !categoriesList.some(c => c.key === selectedCategory)) {
    notFound();
  }

  const subCategoriesList = await getSubCategories(selectedCategory);
  const { products, total } = await getProducts(selectedCategory, selectedSubCategory, searchQuery, currentPage);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Ссылки пагинации сразу с языком: без него middleware делает лишний
  // редирект на каждой странице списка.
  const buildPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (selectedCategory !== 'all') p.set('category', selectedCategory);
    if (selectedSubCategory !== 'all') p.set('subcategory', selectedSubCategory);
    if (searchQuery) p.set('search', searchQuery);
    if (pageNumber > 1) p.set('page', pageNumber.toString());
    const qs = p.toString();
    return `/${locale}${basePath}${qs ? '?' + qs : ''}`;
  };

  // JSON-LD ItemList — на общем каталоге (раньше был на главной)
  const isAllProducts = selectedCategory === 'all' && selectedSubCategory === 'all' && !searchQuery;
  const itemListJsonLd = isAllProducts && products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Товары BAZARI ARA',
    description: 'Грузинские продукты, подарки и товары для туризма в Тбилиси',
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
          url: `https://bazariara.ge/${locale}/products/${catKey}/${product.id}`,
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
    const catName =
      (locale === 'en' && cat?.name_en) || (locale === 'ka' && cat?.name_ka) || cat?.name || selectedCategory;
    // Адреса с префиксом языка: без него middleware редиректит, и крошки
    // указывали бы на редиректы — как было с canonical.
    const base = `https://bazariara.ge/${locale}`;
    const items: object[] = [
      { '@type': 'ListItem', position: 1,
        name: locale === 'en' ? 'Home' : locale === 'ka' ? 'მთავარი' : 'Главная', item: base },
      { '@type': 'ListItem', position: 2, name: catName, item: `${base}?category=${selectedCategory}` },
    ];
    if (selectedSubCategory !== 'all') {
      // Имя из базы, а не из slug: иначе «Лакомство Для Собак»
      const sub = subCategoriesList.find(x => x.key === selectedSubCategory);
      const subName =
        (locale === 'en' && sub?.name_en) || (locale === 'ka' && sub?.name_ka) || sub?.name ||
        selectedSubCategory.replace(/-/g, ' ');
      items.push({
        '@type': 'ListItem',
        position: 3,
        name: subName,
        item: `${base}?category=${selectedCategory}&subcategory=${selectedSubCategory}`,
      });
    }
    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
  })() : null;

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
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
          categoryNames={selectedCategory === 'all'
            ? ALL_PRODUCTS
            : (() => {
                // На подкатегории H1 — её название, как и в title. Раньше
                // была категория: title «Лакомство для собак», а H1
                // «Товары для животных» — поисковик видел расхождение.
                const sub = selectedSubCategory !== 'all'
                  ? subCategoriesList.find(x => x.key === selectedSubCategory) : undefined;
                if (sub) return { ru: sub.name, en: sub.name_en, ka: sub.name_ka };
                const cat = categoriesList.find(c => c.key === selectedCategory);
                return cat ? { ru: cat.name, en: cat.name_en, ka: cat.name_ka } : undefined;
              })()}
          currentPage={currentPage}
        />

        <InteractiveFilters
          categories={categoriesList}
          subCategories={subCategoriesList}
          selectedCategory={selectedCategory}
          selectedSubCategory={selectedSubCategory}
        />

        {/* ✅ aria-label добавлен для семантики */}
        <section aria-label={locale === 'en' ? 'Products' : locale === 'ka' ? 'პროდუქცია' : 'Список товаров'}>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={toCardProduct(product)} index={index} />
            ))}
          </div>

          {/* Пустой результат поиска */}
          {products.length === 0 && (
            <div className="text-center py-20 text-ink-600">
              <p className="text-xl">
                {locale === 'en' ? 'No products found' : locale === 'ka' ? 'პროდუქტი ვერ მოიძებნა' : 'Товары не найдены'}
              </p>
              <p className="text-sm mt-2">
                {locale === 'en' ? 'Try changing your search'
                  : locale === 'ka' ? 'სცადეთ ძიების პარამეტრების შეცვლა'
                  : 'Попробуйте изменить параметры поиска'}
              </p>
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <nav aria-label={locale === 'en' ? 'Pagination' : locale === 'ka' ? 'გვერდები' : 'Пагинация'} className="mt-16 flex justify-center items-center gap-4">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                aria-label={locale === 'en' ? 'Previous page' : locale === 'ka' ? 'წინა გვერდი' : 'Предыдущая страница'}
                className="p-3 rounded-full bg-brand-600 text-on-brand font-bold hover:bg-brand-500 transition-all shadow-lg hover:scale-105"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-ink-100 opacity-50 cursor-not-allowed" aria-disabled="true">
                <ChevronLeftIcon className="h-6 w-6" />
              </div>
            )}
            <span className="text-lg font-semibold text-ink-900 bg-surface/80 rounded-full px-5 py-2">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                aria-label={locale === 'en' ? 'Next page' : locale === 'ka' ? 'შემდეგი გვერდი' : 'Следующая страница'}
                className="p-3 rounded-full bg-brand-600 text-on-brand font-bold hover:bg-brand-500 transition-all shadow-lg hover:scale-105"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-ink-100 opacity-50 cursor-not-allowed" aria-disabled="true">
                <ChevronRightIcon className="h-6 w-6" />
              </div>
            )}
          </nav>
        )}

      </div>
    </div>
  );
}
