// FILE: app/llms.txt/route.ts  →  https://bazariara.ge/llms.txt
//
// Описание магазина для AI-ассистентов и агентов (формат llms.txt: заголовок,
// краткое описание, разделы со ссылками). Раньше это был статичный файл с
// ассортиментом прошлого года — мебель, сантехника, IKEA — и ссылками на
// удалённые категории, которые отвечают 410. Теперь категории берутся из базы.

import { getCategories, getSubCategories } from '@/app/actions';
import { CONTACTS } from '@/lib/contacts';

// На каждый запрос (данные из кэша getCategories): при сборке базы нет, и
// закэшированный на час файл вышел бы без категорий.
export const dynamic = 'force-dynamic';

const SITE = 'https://bazariara.ge';

// Короткие пояснения к категориям; для новых категорий хватит названия из базы.
const ABOUT: Record<string, string> = {
  med: 'мёд от грузинских пасек: акациевый, каштановый, крем-мёд и другие',
  chay: 'грузинский чай из Гурии и Аджарии',
  spetsii: 'специи, аджика, соусы и наборы',
  churchhelaipastila: 'чурчхела и фруктовая пастила',
  vino: 'грузинское вино, в том числе квеври',
  bakalea: 'масла, мука и крупы',
  hiking: 'палатки, спальные мешки, мангалы, дрова, горелки и туристическая мебель',
  power: 'повербанки и кабели для зарядки',
  otkrytki: 'открытки с видами Грузии',
  animals: 'лакомства и инвентарь для собак',
  newyear: 'ёлки, гирлянды и новогодние украшения (в сезон)',
  rynok: 'овощи, фрукты, зелень и грузинский сыр',
};

export async function GET() {
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try { categories = await getCategories(); } catch { /* без базы отдадим разделы без категорий */ }

  const catLines = await Promise.all(categories.map(async (c) => {
    let subs: { key: string; name: string; imageUrl: string }[] = [];
    try { subs = await getSubCategories(c.key); } catch {}
    const withProducts = subs.filter((s) => s.imageUrl && !s.imageUrl.startsWith('/placeholder'));
    const about = ABOUT[c.key] ? `: ${ABOUT[c.key]}` : '';
    const subText = withProducts.length
      ? `\n  ${withProducts.map((s) => `[${s.name}](${SITE}/ru?category=${encodeURIComponent(c.key)}&subcategory=${encodeURIComponent(s.key)})`).join(', ')}`
      : '';
    return `- [${c.name}](${SITE}/ru?category=${encodeURIComponent(c.key)})${about}${subText}`;
  }));

  const body = `# BAZARI ARA — грузинские продукты, подарки и товары для туризма в Тбилиси

> Интернет-магазин в Тбилиси: продукты от небольших грузинских производителей (мёд, чай, специи, чурчхела, вино), гостинцы из Грузии, товары для туризма и отдыха. Доставка по Тбилиси за 2 часа, цены в лари (GEL, ₾). Сайт на русском, английском и грузинском: ${SITE}/ru, ${SITE}/en, ${SITE}/ka.

## Как пользоваться сайтом

- [Все товары](${SITE}/ru/catalog): общий каталог с поиском и страницами.
- Поиск: ${SITE}/ru/catalog?search={запрос} — например, ${SITE}/ru/catalog?search=чурчхела
- Категория: ${SITE}/ru?category={ключ}, подкатегория: ${SITE}/ru?category={ключ}&subcategory={ключ}
- Товар: ${SITE}/ru/products/{категория}/{id} — цена, наличие и описание; на странице есть разметка schema.org Product.
- Заказ оформляется на сайте через корзину (${SITE}/ru/cart) без регистрации: имя и телефон или мессенджер. Можно написать в WhatsApp или Telegram.

## Категории

${catLines.join('\n')}

## Подборки

- [Гостинцы из Грузии](${SITE}/ru/gostintsy-iz-gruzii): что привезти из Грузии в подарок.
- [Туристическое снаряжение в Тбилиси](${SITE}/ru/turisticheskoe-snaryazhenie): палатки, горелки, дрова, туристическая мебель.
- [Повербанки и зарядки](${SITE}/ru/powerbank-i-zaryadki)

## О магазине

- [Производители](${SITE}/ru/farmers): небольшие хозяйства, пасеки и винодельни, с которыми работаем.
- [Регионы Грузии](${SITE}/ru/regions): откуда продукты.
- [Путеводитель по Грузии](${SITE}/ru/blog): статьи о регионах, маршрутах и том, что попробовать.
- [Возврат товара](${SITE}/ru/returns)
- [Политика конфиденциальности](${SITE}/ru/privacy-policy)
- [Условия использования](${SITE}/ru/terms-of-service)

## Контакты

- Телефон и WhatsApp: ${CONTACTS.phoneE164} (${CONTACTS.whatsapp})
- Telegram: ${CONTACTS.telegram}
- Ежедневно ${CONTACTS.hours.opens}–${CONTACTS.hours.closes}, Тбилиси
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
