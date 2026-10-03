// FILE: app/catalog/page.tsx  →  /{locale}/catalog
//
// Все товары, поиск и пагинация. Раньше это была сама главная; теперь главная
// приветственная, а старые /{locale}?page=N и /{locale}?search=… middleware
// переводит сюда 301-м. Категории живут на прежних адресах /{locale}?category=X.

export const revalidate = 600;

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import CatalogView from '@/components/CatalogView';

type SearchParams = Promise<{ [key: string]: string | undefined }>;
type Locale = 'ru' | 'en' | 'ka';

const COPY = {
  ru: {
    title: 'Каталог: грузинские продукты, подарки и товары для туризма | BAZARI ARA',
    description: 'Все товары BAZARI ARA: мёд, чай, специи, чурчхела, гостинцы из Грузии и снаряжение для туризма. Доставка по Тбилиси за 2 часа.',
    page: 'страница',
    search: 'Поиск',
  },
  en: {
    title: 'Catalogue: Georgian food, gifts and travel gear | BAZARI ARA',
    description: 'All BAZARI ARA products: honey, tea, spices, churchkhela, gifts from Georgia and travel gear. Delivery across Tbilisi in 2 hours.',
    page: 'page',
    search: 'Search',
  },
  ka: {
    title: 'კატალოგი: ქართული პროდუქტები, საჩუქრები და ტურისტული ნივთები | BAZARI ARA',
    description: 'BAZARI ARA-ს ყველა პროდუქტი: თაფლი, ჩაი, სანელებლები, ჩურჩხელა, საჩუქრები და ტურისტული აღჭურვილობა. მიწოდება თბილისში 2 საათში.',
    page: 'გვერდი',
    search: 'ძიება',
  },
} as const;

async function getLocale(): Promise<Locale> {
  const lh = (await headers()).get('x-locale');
  return lh === 'en' || lh === 'ka' ? lh : 'ru';
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const locale = await getLocale();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const search = params.search || '';
  const c = COPY[locale];

  const q = page > 1 ? `?page=${page}` : '';
  const alternates = {
    canonical: `https://bazariara.ge/${locale}/catalog${q}`,
    languages: {
      ru: `https://bazariara.ge/ru/catalog${q}`,
      en: `https://bazariara.ge/en/catalog${q}`,
      ka: `https://bazariara.ge/ka/catalog${q}`,
      'x-default': `https://bazariara.ge/ru/catalog${q}`,
    },
  };

  // Страницы поиска в индекс не пускаем: их бесконечно много и они дублируют
  // категории. Ссылки с них при этом учитываются (follow).
  if (search) {
    return {
      title: { absolute: `${c.search}: ${search} | BAZARI ARA` },
      description: c.description,
      robots: { index: false, follow: true },
      alternates: { canonical: alternates.canonical },
    };
  }

  return {
    title: { absolute: page > 1 ? c.title.replace(' | ', ` — ${c.page} ${page} | `) : c.title },
    description: c.description,
    alternates,
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocale();
  const params = await searchParams;

  return (
    <CatalogView
      locale={locale}
      selectedCategory="all"
      selectedSubCategory="all"
      searchQuery={params.search || ''}
      currentPage={Math.max(1, parseInt(params.page || '1', 10) || 1)}
      basePath="/catalog"
    />
  );
}
