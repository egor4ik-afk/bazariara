// FILE: app/category-page/page.tsx
//
// Страница категории. Снаружи адрес прежний — /{locale}?category=X[&subcategory=Y],
// сюда его переписывает middleware. Прямой заход на /category-page отдаёт 404.

export const revalidate = 600;
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CatalogView from '@/components/CatalogView';
import { homeMetadata, type SearchParams } from '../home-metadata';

export const generateMetadata = homeMetadata;

export default async function CategoryPage({ searchParams }: { searchParams: SearchParams }) {
  const lh = (await headers()).get('x-locale');
  const locale: 'ru' | 'en' | 'ka' = lh === 'en' || lh === 'ka' ? lh : 'ru';
  const params = await searchParams;
  const category = params.category;
  if (!category || category === 'all') notFound();

  return (
    <CatalogView
      locale={locale}
      selectedCategory={category}
      selectedSubCategory={params.subcategory || 'all'}
      searchQuery={params.search || ''}
      currentPage={Math.max(1, parseInt(params.page || '1', 10) || 1)}
      basePath=""
    />
  );
}
