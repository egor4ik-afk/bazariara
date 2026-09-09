import { PrismaClient } from '@prisma/client';
import ProductCard from '@/components/ProductCard';
import CategoryCarousel from '@/components/CategoryCarousel';
import InteractiveFilters from '@/components/InteractiveFilters';
import HomeHeader from '@/components/HomeHeader';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { Link } from '@/navigation';
import { getRequestConfig, unstable_setRequestLocale } from 'next-intl/server';
import { getCategories } from './actions';
import { Suspense } from 'react';


const prisma = new PrismaClient();
const PRODUCTS_PER_PAGE = 20;

interface SearchParams {
  search?: string;
  category?: string;
  subcategory?: string;
  sort?: string;
  page?: string;
  [key: string]: string | string[] | undefined;
}

// Генерация статических параметров для маршрутов
export async function generateStaticParams() {
  const locales = ['en', 'ru', 'ka'];
  // Здесь можно добавить другие параметры, если они статичны
  // Например, популярные категории
  return locales.map(locale => ({ locale }));
}

// Основная функция для получения продуктов
async function getProducts(searchParams: SearchParams) {
  const { search, category, subcategory, sort, page } = searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;

  let where: any = {
    in_stock: true, // Only show products that are in stock
    price: {
      not: null,      // Exclude products where price is null
    },
    name: {
      not: ''       // Exclude products with an empty name
    }
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { name_en: { contains: search, mode: 'insensitive' } },
      { name_ru: { contains: search, mode: 'insensitive' } },
      { name_ka: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category_key = category;
  }

  if (subcategory) {
    where.sub_category_key = subcategory;
  }

  let orderBy: any = {};
  if (sort === 'price_asc') {
    orderBy = { price: 'asc' };
  } else if (sort === 'price_desc') {
    orderBy = { price: 'desc' };
  } else {
    orderBy = { created_at: 'desc' };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: (currentPage - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
  });

  const totalProducts = await prisma.product.count({ where });
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  return {
    products: products as any[],
    totalPages,
    totalProducts,
    currentPage,
  };
}


export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { products, totalPages, totalProducts, currentPage } = await getProducts(searchParams);
  const { search, category, subcategory, sort } = searchParams;

  const categoriesData = await getCategories();

  // Логика для построения URL с сохранением фильтров
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    if (sort) params.set('sort', sort);
    if (pageNumber > 1) params.set('page', String(pageNumber));
    const queryString = params.toString();
    return `/?${queryString}`;
  };

  // JSON-LD для главной страницы (список товаров)
  const itemListJsonLd = products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Каталог товаров BAZARI ARA',
    description: 'Свежие фермерские продукты и товары для дома с доставкой по Грузии.',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: (currentPage - 1) * PRODUCTS_PER_PAGE + index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        url: `https://bazari-ara.com/products/${product.category_key || 'gifts'}/${product.id}`,
        image: product.image_url,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'GEL',
          availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
    })),
  } : null;

  const categoryNames = categoriesData.reduce((acc, cat) => {
    acc[cat.key] = { ru: cat.name_ru, en: cat.name_en, ka: cat.name_ka };
    return acc;
  }, {} as { [key: string]: { ru: string, en: string, ka: string } });

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      {/* JSON-LD блоки */}
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}

      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div>Loading header...</div>}>
          <HomeHeader 
            categoryKey={searchParams.category}
            categoryNames={categoryNames}
            currentPage={currentPage}
          />
        </Suspense>
        
        <InteractiveFilters
          categories={categoriesData}
          searchParams={searchParams}
          totalProducts={totalProducts}
          buildPageUrl={buildPageUrl} 
        />

        <div className="mt-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Пустой результат поиска */}
          {products.length === 0 && (
            <div className="text-center py-20 text-ink-600">
              <p className="text-xl">Товары не найдены</p>
              <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
            </div>
          )}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12">
              {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                aria-label="Предыдущая страница"
                className="p-3 rounded-full bg-brand-600 text-white font-bold hover:bg-brand-500 transition-all shadow-lg hover:scale-105"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-ink-100 opacity-50 cursor-not-allowed" aria-disabled="true">
                <ChevronLeftIcon className="h-6 w-6" />
              </div>
            )}
            <span className="text-lg font-semibold text-ink-900 bg-white/80 rounded-full px-5 py-2">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                aria-label="Следующая страница"
                className="p-3 rounded-full bg-brand-600 text-white font-bold hover:bg-brand-500 transition-all shadow-lg hover:scale-105"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-ink-100 opacity-50 cursor-not-allowed" aria-disabled="true">
                <ChevronRightIcon className="h-6 w-6" />
              </div>
            )}
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
