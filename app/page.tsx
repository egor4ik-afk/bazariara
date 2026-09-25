export const revalidate = 600; // синхронно с revalidate в getCategories/getProducts (unstable_cache)
import type { Metadata } from 'next';
import Link from 'next/link';
import InteractiveFilters from '@/components/InteractiveFilters';
import ProductCard from '@/components/ProductCard';
import HomeHeader from '@/components/HomeHeader';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { getCategories, getSubCategories, getProducts } from './actions';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ProducersSection, RegionsSection, BlogSection, ProducerCTASection } from '@/components/home/HomeSections';

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category;
  const subcategory = params.subcategory;
  const page = parseInt(params.page || '1', 10);

  // ✅ ИСПРАВЛЕНО: страница 1 не добавляет page в canonical (избегаем дублей)

  const canonicalParams = new URLSearchParams();
  if (category && category !== 'all') canonicalParams.set('category', category);
  if (subcategory && subcategory !== 'all') canonicalParams.set('subcategory', subcategory);
  // НЕ добавляем page=1 в canonical
  if (page > 1) canonicalParams.set('page', String(page));
  const canonicalQuery = canonicalParams.toString();
  // Canonical обязан совпадать с реальным URL. Middleware редиректит / на /ru,
  // поэтому canonical без префикса указывал на адрес, который сам редиректит.
  const hdrs = await headers();
  const lh = hdrs.get('x-locale');
  const loc = lh === 'en' || lh === 'ka' ? lh : 'ru';
  const canonical = `https://bazariara.ge/${loc}${canonicalQuery ? '?' + canonicalQuery : ''}`;

  // hreflang возвращён: sitemap объявляет три языковые версии, и страница
  // обязана подтверждать это сама. Раньше здесь стояло «сайт одноязычный,
  // hreflang убираем», а sitemap при этом отдавал /ru, /en, /ka — Google
  // видел противоречие.
  const q = canonicalQuery ? '?' + canonicalQuery : '';
  const alternates = {
    canonical,
    languages: {
      ru: `https://bazariara.ge/ru${q}`,
      en: `https://bazariara.ge/en${q}`,
      ka: `https://bazariara.ge/ka${q}`,
      'x-default': `https://bazariara.ge/ru${q}`,
    },
  };

  // Главная — единственная страница, где шаблон « | BAZARI ARA» из layout
  // НЕ применяется (она в том же сегменте, что и layout). Поэтому бренд
  // здесь пишется руками, а на остальных страницах — нет.
  const HOME = {
    ru: { t: 'Грузинские продукты, подарки и туризм — Bazari Ara',
          d: 'Грузинские продукты от местных производителей: мёд, чай, чурчхела, специи. Подарки из Грузии и товары для путешествий с доставкой по Тбилиси за 2 часа.' },
    en: { t: 'Georgian Food, Gifts and Travel Gear — Bazari Ara',
          d: 'Georgian food from local producers: honey, tea, churchkhela, spices. Gifts from Georgia and travel gear delivered across Tbilisi in 2 hours.' },
    ka: { t: 'ქართული პროდუქტები და საჩუქრები — Bazari Ara',
          d: 'ქართული პროდუქცია ადგილობრივი მწარმოებლებისგან: თაფლი, ჩაი, ჩურჩხელა, სანელებლები. საჩუქრები და მოგზაურობის ნივთები, მიწოდება თბილისში 2 საათში.' },
  }[loc];

  if (!category || category === 'all') {
    return { title: { absolute: HOME.t }, description: HOME.d, alternates };
  }

  const categories = await getCategories();
  const cat = categories.find(c => c.key === category);
  const catName =
    (loc === 'en' && cat?.name_en) || (loc === 'ka' && cat?.name_ka) || cat?.name || category;

  const pageSuffix = page > 1
    ? (loc === 'en' ? ` — page ${page}` : loc === 'ka' ? ` — გვერდი ${page}` : ` — страница ${page}`)
    : '';

  const buy = loc === 'en' ? 'buy in Tbilisi' : loc === 'ka' ? 'იყიდე თბილისში' : 'купить в Тбилиси';

  if (subcategory && subcategory !== 'all') {
    // Название берём из БД, а не из slug. Раньше «лакомство-для-собак»
    // превращался в «Лакомство Для Собак» — заглавные посреди русской
    // фразы, и никакого перевода на en/ka.
    const subs = await getSubCategories(category);
    const sub = subs.find(x => x.key === subcategory);
    const subName =
      (loc === 'en' && sub?.name_en) || (loc === 'ka' && sub?.name_ka) || sub?.name ||
      subcategory.replace(/-/g, ' ');

    return {
      title: { absolute: `${subName} — ${buy}${pageSuffix} | BAZARI ARA` },
      description:
        loc === 'en' ? `${subName} in ${catName}: see the range and prices. Delivery across Tbilisi in 2 hours, order online.`
        : loc === 'ka' ? `${subName} — ${catName}: ასორტიმენტი და ფასები. მიწოდება თბილისში 2 საათში.`
        : `${subName} в разделе «${catName}»: ассортимент и цены. Доставка по Тбилиси за 2 часа, заказ онлайн без регистрации.`,
      alternates,
    };
  }

  return {
    title: { absolute: `${catName} — ${buy}${pageSuffix} | BAZARI ARA` },
    description:
      loc === 'en' ? `${catName} in Tbilisi: the full range with prices and photos. Delivery across the city in 2 hours, order online.`
      : loc === 'ka' ? `${catName} თბილისში: სრული ასორტიმენტი ფასებით. მიწოდება ქალაქში 2 საათში.`
      : `${catName} в Тбилиси: весь ассортимент с ценами и фото. Доставка по городу за 2 часа, заказ онлайн без регистрации.`,
    alternates,
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const hdrs = await headers();
  const lh = hdrs.get('x-locale');
  const locale: 'ru' | 'en' | 'ka' = lh === 'en' || lh === 'ka' ? lh : 'ru';

  const params = await searchParams;

  const selectedCategory    = params.category || 'all';
  const selectedSubCategory = params.subcategory || 'all';
  const searchQuery         = params.search || '';
  const currentPage         = parseInt(params.page || '1', 10);
  const ITEMS_PER_PAGE      = 20;

  const categoriesList    = await getCategories();

  if (selectedCategory !== 'all' && !categoriesList.some(c => c.key === selectedCategory)) {
    notFound();
  }

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
        <section aria-label={locale === 'en' ? 'Products' : locale === 'ka' ? 'პროდუქცია' : 'Список товаров'}>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
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

        {/* Блоки новой главной (ТЗ раздел 14). Показываем только на самой
            главной: при выбранной категории или поиске человек решает
            конкретную задачу, и эти секции только мешают. */}
        {isHomePage && (
          <>
            <ProducersSection locale={locale} />
            <RegionsSection locale={locale} />
            <BlogSection locale={locale} />
            <ProducerCTASection locale={locale} />
          </>
        )}
      </div>
    </div>
  );
}
