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
  sub_category?: string; subCategoryKey?: string; category_en?: string; sub_category_en?: string;
};

// Словарь названий категорий для SEO
const CATEGORY_NAMES: Record<string, string> = {
  top:                         'Популярные товары',
  hiking:                      'Туризм и отдых',
  garden:                      'Сад и огород',
  furniture:                   'Мебель',
  toys:                        'Игрушки',
  heaters:                     'Обогреватели',
  lighting:                    'Освещение',
  climate:                     'Климатическое оборудование',
  plumbing:                    'Сантехника',
  pet_products:                'Товары для животных',
  power_banks_and_accessories: 'Портативные аккумуляторы и аксессуары',
  warehouse:                   'Складские товары',
};

// 🔹 Динамические метаданные — уникальный title/description + canonical для каждой
//    комбинации категория/подкатегория. Параметр page отсекается из canonical,
//    чтобы /?page=2 не ранжировался отдельно от /?category=hiking
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}): Promise<Metadata> {
  const category    = searchParams.category;
  const subcategory = searchParams.subcategory;
  const page        = parseInt(searchParams.page || '1', 10);
  const pageStr     = page > 1 ? ` — страница ${page}` : '';

  // Canonical ВСЕГДА без ?page= — все страницы пагинации ссылаются
  // на чистый URL категории/подкатегории, исключая дублирование в индексе
  const canonicalParams = new URLSearchParams();
  if (category && category !== 'all') canonicalParams.set('category', category);
  if (subcategory && subcategory !== 'all') canonicalParams.set('subcategory', subcategory);
  const canonicalQuery = canonicalParams.toString();
  const canonical = `https://bazariara.ge/${canonicalQuery ? '?' + canonicalQuery : ''}`;

  // — Главная (все категории) —
  if (!category || category === 'all') {
    return {
      title: `BAZARI ARA: Товары для дома, сада, туризма и отдыха в Тбилиси${pageStr}`,
      description: 'Товары для дома, сада, туризма и детей в Тбилиси. Доставка за 2 часа по городу. Более 1000 товаров по доступным ценам — заказывайте онлайн!',
      alternates: { canonical },
    };
  }

  const catName = CATEGORY_NAMES[category] || category;

  // — Категория + подкатегория —
  if (subcategory && subcategory !== 'all') {
    const subName = subcategory
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      title: `${subName} — ${catName} | купить в Тбилиси | BAZARI ARA${pageStr}`,
      description: `${subName} в категории «${catName}». Быстрая доставка по Тбилиси за 2 часа. Доступные цены, более 1000 товаров в наличии.`,
      alternates: { canonical },
    };
  }

  // — Только категория —
  return {
    title: `${catName} — купить в Тбилиси с доставкой за 2 часа | BAZARI ARA${pageStr}`,
    description: `Большой выбор товаров «${catName}» в Тбилиси. Заказывайте онлайн по доступным ценам — доставим за 2 часа.`,
    alternates: { canonical },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  let products: Product[] = [];
  let categoriesData: Record<string, any> = {};

  try {
    const productsRef = database.ref('products');
    const snapshot = await productsRef.once('value');
    categoriesData = snapshot.val() || {};
    const allProducts: Product[] = [];
    const generateKey = (name: string) =>
      name ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';

    Object.keys(categoriesData).forEach(categoryKey => {
      const productsInCategory = categoriesData[categoryKey];
      if (productsInCategory && typeof productsInCategory === 'object') {
        Object.keys(productsInCategory).forEach(firebaseDocumentKey => {
          // 🔹 Пропускаем служебное поле category_image — это не товар
          if (firebaseDocumentKey === 'category_image') return;

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
    products = allProducts;
  } catch (error) {
    console.error('Firebase fetch error:', error);
    products = [];
    categoriesData = {};
  }

  const t = translations.ru;

  // 1. Читаем параметры URL
  const selectedCategory    = searchParams.category || 'all';
  const selectedSubCategory = searchParams.subcategory || 'all';
  const searchQuery         = searchParams.search || '';
  const currentPage         = parseInt(searchParams.page || '1', 10);

  // 2. Базовая фильтрация: только товары с картинкой
  let filteredProducts = products.filter(
    p => p.image_url && p.image_url.trim() !== ''
  );

  // 3. Собираем список категорий ДО любой фильтрации по категории
  //    imageUrl берётся из поля category_image узла категории в Firebase,
  //    с фолбэком на фото первого товара
  const categoryMap = new Map<string, { name: string; name_en?: string; key: string; imageUrl: string }>();
  filteredProducts.forEach(product => {
    if (!categoryMap.has(product.categoryKey)) {
      categoryMap.set(product.categoryKey, {
        name: product.category,
        name_en: product.category_en,
        key: product.categoryKey,
        imageUrl: categoriesData[product.categoryKey]?.category_image || product.image_url!,
      });
    }
  });
  const categoriesList = Array.from(categoryMap.values());

  // 4. Фильтрация по категории
  const subCategoryMap = new Map<string, { name: string; name_en?: string; key: string; imageUrl: string }>();
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
          name_en: product.sub_category_en,
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
  //    — При category=all товары TOP показываются ТОЛЬКО на странице 1.
  //      На странице 2+ они исключаются, чтобы не дублироваться.
  //    — Внутри каждой категории: сначала in_stock, потом остальные.
  if (selectedCategory === 'all') {
    if (currentPage === 1) {
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
      // Страница 2+: TOP исключаем — они уже были на первой странице
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
    filteredProducts = filteredProducts.sort((a, b) => {
      if (a.in_stock && !b.in_stock) return -1;
      if (!a.in_stock && b.in_stock) return 1;
      return 0;
    });
  }

  // 8. Пагинация
  const ITEMS_PER_PAGE = 20;

  const totalPages = selectedCategory === 'all'
    ? (() => {
        const baseFiltered = products.filter(p => p.image_url && p.image_url.trim() !== '');
        const topCount   = baseFiltered.filter(p => p.categoryKey === 'top').length;
        const otherCount = baseFiltered.filter(p => p.categoryKey !== 'top').length;
        const othersOnPage1    = Math.max(0, ITEMS_PER_PAGE - topCount);
        const remainingOthers  = Math.max(0, otherCount - othersOnPage1);
        return 1 + Math.ceil(remainingOthers / ITEMS_PER_PAGE);
      })()
    : Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const startIndex       = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // 9. Генерация URL для пагинации (SEO-friendly)
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all')    params.set('category', selectedCategory);
    if (selectedSubCategory !== 'all') params.set('subcategory', selectedSubCategory);
    if (searchQuery)                   params.set('search', searchQuery);
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
            {paginatedProducts.map((product, index) => {
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
                      <ProductImageSlider
                        images={uniqueImageUrls}
                        alt={product.title}
                        priority={index < 4}
                      />

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