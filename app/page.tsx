
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
  const pageStr = page > 1 ? ` — страница ${page}` : '';

  const canonicalParams = new URLSearchParams();
  if (category && category !== 'all') canonicalParams.set('category', category);
  if (subcategory && subcategory !== 'all') canonicalParams.set('subcategory', subcategory);
  const canonicalQuery = canonicalParams.toString();
  const canonical = `https://bazariara.ge/${canonicalQuery ? '?' + canonicalQuery : ''}`;

  if (!category || category === 'all') {
    return {
      title: `BAZARI ARA: Товары для дома, сада, туризма и отдыха в Тбилиси${pageStr}`,
      description: 'Товары для дома, сада, туризма и детей в Тбилиси. Доставка за 2 часа по городу. Более 1000 товаров по доступным ценам — заказывайте онлайн!',
      alternates: { canonical },
    };
  }

  const categories = await getCategories();
  const cat = categories.find(c => c.key === category)
  const catName = cat ? cat.name : category;

  if (subcategory && subcategory !== 'all') {
    const subName = subcategory.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return {
      title: `${subName} — ${catName} | купить в Тбилиси | BAZARI ARA${pageStr}`,
      description: `${subName} в категории «${catName}». Быстрая доставка по Тбилиси за 2 часа.`,
      alternates: { canonical },
    };
  }

  return {
    title: `${catName} — купить в Тбилиси с доставкой за 2 часа | BAZARI ARA${pageStr}`,
    description: `Большой выбор товаров «${catName}» в Тбилиси. Заказывайте онлайн — доставим за 2 часа.`,
    alternates: { canonical },
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const selectedCategory    = params.category || 'all';
  const selectedSubCategory = params.subcategory || 'all';
  const searchQuery         = params.search || '';
  const currentPage         = parseInt(params.page || '1', 10);
  const ITEMS_PER_PAGE      = 20;

  const categoriesList = await getCategories();
  const subCategoriesList = await getSubCategories(selectedCategory);
  const { products, total } = await getProducts(selectedCategory, selectedSubCategory, searchQuery, currentPage);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const buildPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (selectedCategory !== 'all') p.set('category', selectedCategory);
    if (selectedSubCategory !== 'all') p.set('subcategory', selectedSubCategory);
    if (searchQuery) p.set('search', searchQuery);
    p.set('page', pageNumber.toString());
    return `/?${p.toString()}`;
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <main className="container mx-auto px-4 py-1 sm:px-6 lg:px-8">
        <HomeHeader
          categoryNames={selectedCategory !== 'all'
            ? (() => {
                const cat = categoriesList.find(c => c.key === selectedCategory);
                return cat ? { ru: cat.name, en: cat.name_en, ka: cat.name_ka } : undefined;
              })()
            : undefined}
        />

        <InteractiveFilters
          categories={categoriesList}
          subCategories={subCategoriesList}
          selectedCategory={selectedCategory}
          selectedSubCategory={selectedSubCategory}
        />

        <section>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>

        {totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-4">
            {currentPage > 1 ? (
              <Link href={buildPageUrl(currentPage - 1)} className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all shadow-lg hover:scale-105">
                <ChevronLeftIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-gray-700 opacity-50 cursor-not-allowed">
                <ChevronLeftIcon className="h-6 w-6" />
              </div>
            )}
            <span className="text-lg font-semibold text-white bg-gray-800/80 rounded-full px-5 py-2">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link href={buildPageUrl(currentPage + 1)} className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all shadow-lg hover:scale-105">
                <ChevronRightIcon className="h-6 w-6" />
              </Link>
            ) : (
              <div className="p-3 rounded-full bg-gray-700 opacity-50 cursor-not-allowed">
                <ChevronRightIcon className="h-6 w-6" />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
