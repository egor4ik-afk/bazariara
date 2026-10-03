// Метаданные главной и страниц категорий (/{locale} и /{locale}?category=X).
// Общие для app/page.tsx (приветственная) и app/category-page/page.tsx
// (категории), чтобы title, canonical и hreflang считались одинаково.
import type { Metadata } from 'next';
import { getCategories, getSubCategories } from './actions';
import { headers } from 'next/headers';

export type SearchParams = Promise<{ [key: string]: string | undefined }>;

export async function homeMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
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
        loc === 'en' ? `${subName} in ${catName}: the full range with prices and photos. Delivery across Tbilisi in 2 hours, order online.`
        : loc === 'ka' ? `${subName} — ${catName}: სრული ასორტიმენტი ფასებითა და ფოტოებით. მიწოდება თბილისში 2 საათში, შეკვეთა ონლაინ.`
        : `${subName} в разделе «${catName}»: ассортимент и цены. Доставка по Тбилиси за 2 часа, заказ онлайн без регистрации.`,
      alternates,
    };
  }

  return {
    title: { absolute: `${catName} — ${buy}${pageSuffix} | BAZARI ARA` },
    description:
      loc === 'en' ? `${catName} in Tbilisi: the full range with prices and photos. Delivery across the city in 2 hours, order online with no sign-up.`
      : loc === 'ka' ? `${catName} თბილისში: სრული ასორტიმენტი ფასებითა და ფოტოებით. მიწოდება ქალაქში 2 საათში, შეკვეთა ონლაინ რეგისტრაციის გარეშე.`
      : `${catName} в Тбилиси: весь ассортимент с ценами и фото. Доставка по городу за 2 часа, заказ онлайн без регистрации и оплата при получении.`,
    alternates,
  };
}

