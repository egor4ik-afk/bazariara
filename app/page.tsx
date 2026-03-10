import { database } from '@/lib/firebase/server';
import type { Metadata } from 'next';
import { translations } from '@/lib/translations';
import Link from 'next/link';
import QuantityInput from '@/components/QuantityInput';
import InteractiveFilters from '@/components/InteractiveFilters';
import ProductImageSlider from '@/components/ProductImageSlider';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// 🔹 ISR: Обновление кэша базы данных каждые 10 минут
export const revalidate = 600;

type Product = {
  id: string; title: string; category: string; price: number; in_stock: boolean;
  description?: string; image_url?: string; categoryKey: string; image_urls?: string[];
  sub_category?: string; subCategoryKey?: string;
};

// 🔹 Метаданные (SEO)
export const metadata: Metadata = {
  title: 'BAZARI ARA: Товары для дома, сада, туризма и отдыха',
  description: 'Широкий ассортимент товаров. Быстрая доставка по Тбилиси за 2 часа!',
};

async function fetchProductsFromFirebase(): Promise<Product[]> {
  try {
    const productsRef = database.ref('products');
    const snapshot = await productsRef.once('value');
    const categoriesData = snapshot.val() || {};
    const allProducts: Product[] = [];
    const generateKey = (name: string) =>
      name ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';

    Object.keys(categoriesData).forEach(categoryKey => {
      const productsInCategory = categoriesData[categoryKey];
      if (productsInCategory && typeof productsInCategory === 'object') {
        Object.keys(productsInCategory).forEach(firebaseDocumentKey => {
          const productData = productsInCategory[firebaseDocumentKey];
          if (productData && typeof productData === 'object' && productData.title) {
            const newProduct: Product = { ...productData, id: firebaseDocumentKey, categoryKey };
            if (productData.sub_category) {
              newProduct.subCategoryKey = generateKey(productData.sub_category);
            }
            allProducts.push(newProduct);
          }
        });
      }
    });

    // ❌ Убрана глобальная сортировка по категориям — она вызывала дубли TOP при ISR.
    // Порядок категорий теперь управляется в HomePage ниже.

    return allProducts;
  } catch (error) {
    return [];
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const products = await fetchProductsFromFirebase();
  const t = translations.ru;

  // 1. Читаем параметры URL
  const selectedCategory = searchParams.category || 'all';
  const selectedSubCategory = searchParams.subcategory || 'all';
  const searchQuery = searchParams.search || '';
  const currentPage = parseInt(searchParams.page || '1', 10);

  // 2. Базовая фильтрация: только товары с картинкой
  let filteredProducts = products.filter(
    p => p.image_url && p.image_url.trim() !== ''
  );

  // 3. Собираем список категорий ДО любой фильтрации по категории
  const categoryMap = new Map<string, { name: string; key: string; imageUrl: string }>();
  filteredProducts.forEach(product => {
    if (!categoryMap.has(product.categoryKey)) {
      categoryMap.set(product.categoryKey, {
        name: product.category,
        key: product.categoryKey,
        imageUrl: product.image_url!,
      });
    }
  });
  const categoriesList = Array.from(categoryMap.values());

  // 4. Фильтрация по категории
  const subCategoryMap = new Map<string, { name: string; key: string; imageUrl: string }>();
  if (selectedCategory !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.categoryKey === selectedCategory);
    filteredProducts.forEach(product => {
      if (
        product.sub_category &&
        product.subCategoryKey &&
        !subCategoryMap.has(product.subCategoryKey)
      ) {
        subCategoryMap.set(product.subCategoryKey, {
          name: product.sub_category,
          key: product.subCategoryKey,
          imageUrl: product.image_url!,
        });
      }
    });
  }
  const subCategoriesList = Array.from(subCategoryMap.values());

  // 5. Фильтрация по подкатегории
  if (selectedSubCategory !== 'all') {
    filteredProducts = filteredProducts.filter(
      p => p.subCategoryKey === selectedSubCategory
    );
  }

  // 6. Поиск
  if (searchQuery.length >= 2) {
    filteredProducts = filteredProducts.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // 7. Сортировка:
  //    — При просмотре всех категорий (all) товары TOP показываются ТОЛЬКО на странице 1.
  //      На странице 2+ они исключаются, чтобы не дублироваться.
  //    — Внутри каждой категории: сначала in_stock, потом остальные.
  if (selectedCategory === 'all') {
    if (currentPage === 1) {
      // Страница 1: TOP идут первыми, затем остальные — каждая группа сортирована по in_stock
      const topProducts = filteredProducts
        .filter(p => p.categoryKey === 'top')
        .sort((a, b) => {
          if (a.in_stock && !b.in_stock) return -1;
          if (!a.in_stock && b.in_stock) return 1;
          return 0;
        });

      const otherProducts = filteredProducts
        .filter(p => p.categoryKey !== 'top')
        .sort((a, b) => {
          const order: Record<string, number> = { hiking: 1 };
          const catDiff = (order[a.categoryKey] || 2) - (order[b.categoryKey] || 2);
          if (catDiff !== 0) return catDiff;
          if (a.in_stock && !b.in_stock) return -1;
          if (!a.in_stock && b.in_stock) return 1;
          return 0;
        });

      filteredProducts = [...topProducts, ...otherProducts];
    } else {
      // Страница 2+: TOP полностью исключаем — они уже были на первой странице
      filteredProducts = filteredProducts
        .filter(p => p.categoryKey !== 'top')
        .sort((a, b) => {
          const order: Record<string, number> = { hiking: 1 };
          const catDiff = (order[a.categoryKey] || 2) - (order[b.categoryKey] || 2);
          if (catDiff !== 0) return catDiff;
          if (a.in_stock && !b.in_stock) return -1;
          if (!a.in_stock && b.in_stock) return 1;
          return 0;
        });
    }
  } else {
    // Выбрана конкретная категория — просто сортируем по in_stock
    filteredProducts = filteredProducts.sort((a, b) => {
      if (a.in_stock && !b.in_stock) return -1;
      if (!a.in_stock && b.in_stock) return 1;
      return 0;
    });
  }

  // 8. Пагинация
  const ITEMS_PER_PAGE = 20;

  // Для корректного расчёта totalPages при category=all нужно знать
  // общее количество товаров БЕЗ учёта исключения TOP на стр. 2+.
  // Считаем отдельно: TOP товары займут место только на стр. 1.
  let totalProductsForPagination: number;
  if (selectedCategory === 'all') {
    const baseFiltered = products.filter(p => p.image_url && p.image_url.trim() !== '');
    const topCount = baseFiltered.filter(p => p.categoryKey === 'top').length;
    const otherCount = baseFiltered.filter(p => p.categoryKey !== 'top').length;

    // Страница 1 вмещает (ITEMS_PER_PAGE - topCount) других товаров + все TOP
    // Остальные страницы — только otherProducts
    const othersOnPage1 = Math.max(0, ITEMS_PER_PAGE - topCount);
    const remainingOthers = Math.max(0, otherCount - othersOnPage1);
    const extraPages = Math.ceil(remainingOthers / ITEMS_PER_PAGE);
    totalProductsForPagination = topCount > 0 ? (1 + extraPages) * ITEMS_PER_PAGE : otherCount;
    // Упрощённо: просто считаем реальные страницы
    const page1Items = Math.min(ITEMS_PER_PAGE, topCount + otherCount);
    const afterPage1 = Math.max(0, otherCount - Math.max(0, page1Items - topCount));
    const totalPages_ = 1 + Math.ceil(afterPage1 / ITEMS_PER_PAGE);
    totalProductsForPagination = totalPages_ * ITEMS_PER_PAGE; // используется только для totalPages
  } else {
    totalProductsForPagination = filteredProducts.length;
  }

  const totalPages = selectedCategory === 'all'
    ? (() => {
        const baseFiltered = products.filter(p => p.image_url && p.image_url.trim() !== '');
        const topCount = baseFiltered.filter(p => p.categoryKey === 'top').length;
        const otherCount = baseFiltered.filter(p => p.categoryKey !== 'top').length;
        const othersOnPage1 = Math.max(0, ITEMS_PER_PAGE - topCount);
        const remainingOthers = Math.max(0, otherCount - othersOnPage1);
        return 1 + Math.ceil(remainingOthers / ITEMS_PER_PAGE);
      })()
    : Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // 9. Генерация URL для пагинации (SEO-friendly)
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedSubCategory !== 'all') params.set('subcategory', selectedSubCategory);
    if (searchQuery) params.set('search', searchQuery);
    params.set('page', pageNumber.toString());
    return `/?${params.toString()}`;
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <main className="container mx-auto px-4 py-1 sm:px-6 lg:px-8">
        <div className="text-center py-4">
          <h1 className="text-4xl font-bold text-white mb-4">{t.home.title}</h1>
          <p className="text-2xl font-bold text-lime-400">{t.home.delivery}</p>
        </div>

        {/* Интерактивные фильтры (Клиентский компонент) */}
        <InteractiveFilters
          categories={categoriesList}
          subCategories={subCategoriesList}
          selectedCategory={selectedCategory}
          selectedSubCategory={selectedSubCategory}
        />

        <section>
          <h2 className="text-3xl font-bold text-white my-8">
            {selectedCategory === 'all'
              ? t.home.allProducts
              : categoriesList.find(c => c.key === selectedCategory)?.name}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {paginatedProducts.map(product => {
              const imageUrls = [product.image_url, ...(product.image_urls || [])].filter(
                Boolean
              ) as string[];
              const uniqueImageUrls = [...new Set(imageUrls)];

              return (
                <div
                  key={product.id}
                  className="bg-gray-800/40 rounded-xl shadow-lg overflow-hidden flex flex-col group transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl hover:shadow-lime-500/20"
                >
                  <div className="relative flex-grow">
                    <Link
                      prefetch={false}
                      href={`/products/${product.categoryKey}/${product.id}`}
                      className="block h-full"
                    >
                      <ProductImageSlider images={uniqueImageUrls} alt={product.title} />

                      <div className="p-5">
                        <h3 className="text-xl font-bold mb-2 truncate group-hover:text-lime-400 transition-colors duration-300">
                          {product.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-3">{product.category}</p>
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="flex items-baseline gap-2 mr-auto">
                            <p className="text-2xl font-semibold text-lime-500 whitespace-nowrap">
                              {product.price} ₾
                            </p>
                          </div>
                          {product.in_stock && (
                            <span className="text-sm font-semibold text-green-400 shrink-0">
                              {t.home.inStock}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                  <div className="p-5 pt-0 mt-auto">
                    <QuantityInput product={product} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Серверная пагинация */}
        {totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-4">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all shadow-lg hover:scale-105"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-gray-700 text-gray-900 opacity-50 cursor-not-allowed">
                <ChevronLeftIcon className="h-6 w-6" />
              </div>
            )}

            <span className="text-lg font-semibold text-white bg-gray-800/80 rounded-full px-5 py-2">
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all shadow-lg hover:scale-105"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-gray-700 text-gray-900 opacity-50 cursor-not-allowed">
                <ChevronRightIcon className="h-6 w-6" />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}