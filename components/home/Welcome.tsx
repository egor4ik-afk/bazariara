// FILE: components/home/Welcome.tsx
//
// Приветственная главная (/{locale} без параметров). Раньше здесь сразу
// показывался весь каталог: 20 карточек со слайдерами, 4 картинки грузились
// немедленно, одна из них (436 КБ) и была LCP 4,4 с. Из поиска люди всё равно
// приходят на товар или категорию, а на главной им нужно понять, что это за
// магазин, и выбрать раздел.
//
// Первый экран — только текст и форма поиска: он рисуется без картинок и без
// клиентского JS. Плитки разделов ниже, их фото грузятся лениво и с низким
// приоритетом. Под плитками — подкатегории обычными ссылками: это пути
// для Google к страницам, которые уже держат позиции (палатки, дрова, термосы…).
//
// Работает целиком на сервере; данные — из кэша (getCategories/getSubCategories
// и секции ниже кэшируются на 10 минут), так что заход на главную не ходит в базу.

import Link from 'next/link';
import { getCategories, getSubCategories } from '@/app/actions';
import { translations } from '@/lib/translations';
import type { Category } from '@/lib/types';
import CdnImg from '@/components/CdnImg';
import type { ImgWidth } from '@/lib/img';
import {
  ProducersSection,
  RegionsSection,
  BlogSection,
  ProducerCTASection,
} from '@/components/home/HomeSections';

type Locale = 'ru' | 'en' | 'ka';
type L3 = Record<Locale, string>;

type Tile =
  | { kind: 'category'; key: string }
  // Подкатегория плиткой (Рынок: «Овощи», «Фрукты»)
  | { kind: 'sub'; category: string }
  // SEO-страница вместо категории; фото берём у близкой по смыслу категории
  | { kind: 'page'; path: string; name: (l: Locale) => string; imageFrom: string };

type Group = {
  id: string;
  title: L3;
  lead?: L3;
  tiles: Tile[];
  link?: { path: string; label: L3 };
};

const cat = (key: string): Tile => ({ kind: 'category', key });

const GROUPS: Group[] = [
  {
    // Плитки — подкатегории «Рынка». Пока в нём нет товаров с фото, блок
    // не показывается: пустой раздел на главной хуже, чем никакого.
    id: 'market',
    title: { ru: 'Рынок', en: 'Market', ka: 'ბაზარი' },
    lead: {
      ru: 'Овощи и фрукты по сезону — как с тбилисского рынка, только с доставкой.',
      en: 'Seasonal fruit and vegetables, like from a Tbilisi market, delivered.',
      ka: 'სეზონური ხილი და ბოსტნეული მიტანით.',
    },
    tiles: [{ kind: 'sub', category: 'rynok' }],
  },
  {
    id: 'food',
    title: { ru: 'Еда из Грузии', en: 'Georgian food', ka: 'ქართული პროდუქტები' },
    lead: {
      ru: 'Мёд, чай, специи, чурчхела и вино от небольших хозяйств из разных регионов.',
      en: 'Honey, tea, spices, churchkhela and wine from small farms across the country.',
      ka: 'თაფლი, ჩაი, სანელებლები, ჩურჩხელა და ღვინო მცირე მეურნეობებიდან.',
    },
    tiles: ['med', 'chay', 'spetsii', 'churchhelaipastila', 'vino', 'bakalea'].map(cat),
  },
  {
    id: 'travel',
    title: { ru: 'Туризм и отдых', en: 'Travel and outdoors', ka: 'ტურიზმი და დასვენება' },
    lead: {
      ru: 'Палатки, горелки, термосы и повербанки для поездок в горы и на природу.',
      en: 'Tents, burners, flasks and power banks for trips to the mountains.',
      ka: 'კარვები, თერმოსები და პაუერბანკები მოგზაურობისთვის.',
    },
    tiles: [cat('hiking'), cat('power')],
    link: {
      path: '/turisticheskoe-snaryazhenie',
      label: { ru: 'Что взять в поход', en: 'Camping gear guide', ka: 'ტურისტული აღჭურვილობა' },
    },
  },
  {
    id: 'gifts',
    title: { ru: 'Сувениры и подарки', en: 'Souvenirs and gifts', ka: 'სუვენირები და საჩუქრები' },
    lead: {
      ru: 'Что привезти из Грузии: гостинцы, сладости и открытки.',
      en: 'What to bring home from Georgia: treats, sweets and postcards.',
      ka: 'რა წაიღოთ საქართველოდან: საჩუქრები, ტკბილეული და ღია ბარათები.',
    },
    tiles: [
      {
        kind: 'page',
        path: '/gostintsy-iz-gruzii',
        name: (l) => translations[l].footer.gifts,
        imageFrom: 'churchhelaipastila',
      },
      cat('otkrytki'),
    ],
  },
];

// Сезонная группа: «Новый год» стоит первой, пока в категории есть товары с фото.
const SEASON: Group = {
  id: 'season',
  title: { ru: 'К Новому году', en: 'For New Year', ka: 'ახალი წლისთვის' },
  lead: {
    ru: 'Ёлки, гирлянды и украшения с доставкой по Тбилиси.',
    en: 'Trees, lights and decorations delivered across Tbilisi.',
    ka: 'ნაძვის ხეები, გირლანდები და დეკორაციები მიტანით თბილისში.',
  },
  tiles: [{ kind: 'sub', category: 'newyear' }],
};

// Категории, которых нет в группах выше (новые или «Для животных»), не теряются,
// а попадают сюда.
const MORE_TITLE: L3 = { ru: 'Ещё в каталоге', en: 'Also in the catalogue', ka: 'ასევე კატალოგში' };

const COPY = {
  ru: {
    searchLabel: 'Поиск по товарам',
    searchPlaceholder: 'Например, мёд или палатка',
    find: 'Найти',
    allProducts: 'Смотреть все товары',
    subcats: 'Подразделы',
  },
  en: {
    searchLabel: 'Search products',
    searchPlaceholder: 'For example, honey or a tent',
    find: 'Search',
    allProducts: 'Browse all products',
    subcats: 'Subcategories',
  },
  ka: {
    searchLabel: 'პროდუქტების ძიება',
    searchPlaceholder: 'მაგალითად, თაფლი ან კარავი',
    find: 'ძიება',
    allProducts: 'ყველა პროდუქტის ნახვა',
    subcats: 'ქვეკატეგორიები',
  },
} as const;

const MAX_SUBCATS_PER_CATEGORY = 12;

const hasPhoto = (url: string | null | undefined): url is string =>
  !!url && !url.startsWith('/placeholder');

function localName(c: { name: string; name_en?: string | null; name_ka?: string | null }, l: Locale) {
  return l === 'en' ? (c.name_en || c.name) : l === 'ka' ? (c.name_ka || c.name) : c.name;
}

function categoryHref(locale: Locale, category: string, sub?: string) {
  const p = new URLSearchParams({ category });
  if (sub) p.set('subcategory', sub);
  return `/${locale}?${p.toString()}`;
}

type ResolvedTile = { href: string; name: string; image: string | null };
type ResolvedGroup = {
  id: string;
  title: string;
  lead?: string;
  tiles: ResolvedTile[];
  subcats: { href: string; name: string }[];
  link?: { href: string; label: string };
};

async function resolveGroups(locale: Locale): Promise<ResolvedGroup[]> {
  let categories: Category[] = [];
  try {
    categories = await getCategories();
  } catch (e) {
    // Без базы главная всё равно покажет первый экран, поиск и ссылку на каталог.
    console.error('Welcome: categories', e);
    return [];
  }
  const byKey = new Map(categories.map((c) => [c.key, c]));

  const used = new Set<string>();
  for (const g of [SEASON, ...GROUPS]) {
    for (const t of g.tiles) {
      if (t.kind === 'category') used.add(t.key);
      if (t.kind === 'sub') used.add(t.category);
    }
  }
  const leftovers = categories.filter((c) => !used.has(c.key));
  const groups: Group[] = [
    SEASON,
    ...GROUPS,
    ...(leftovers.length ? [{ id: 'more', title: MORE_TITLE, tiles: leftovers.map((c) => cat(c.key)) }] : []),
  ];

  return Promise.all(
    groups.map(async (g) => {
      const tiles: ResolvedTile[] = [];
      const catKeys: string[] = [];
      for (const t of g.tiles) {
        if (t.kind === 'category') {
          const c = byKey.get(t.key);
          // Категории нет в базе или в ней нет ни одного товара с фото
          // (тогда у неё нет и картинки) — плитку не показываем.
          if (!c || !hasPhoto(c.imageUrl)) continue;
          catKeys.push(c.key);
          tiles.push({
            href: categoryHref(locale, c.key),
            name: localName(c, locale),
            image: c.imageUrl,
          });
        } else if (t.kind === 'sub') {
          if (!byKey.has(t.category)) continue;
          let subs: Category[] = [];
          try { subs = (await getSubCategories(t.category)) as Category[]; } catch { subs = []; }
          for (const s of subs) {
            if (!hasPhoto(s.imageUrl)) continue;
            tiles.push({ href: categoryHref(locale, t.category, s.key), name: localName(s, locale), image: s.imageUrl });
          }
        } else {
          const src = byKey.get(t.imageFrom)?.imageUrl;
          tiles.push({
            href: `/${locale}${t.path}`,
            name: t.name(locale),
            image: hasPhoto(src) ? src : null,
          });
        }
      }

      // Подкатегории без фото обычно пустые (каталог показывает только товары
      // с картинкой) — на пустые страницы с главной не ведём.
      const subLists = await Promise.all(
        catKeys.map(async (key) => {
          try {
            const subs = await getSubCategories(key);
            return subs
              .filter((s) => hasPhoto(s.imageUrl))
              .slice(0, MAX_SUBCATS_PER_CATEGORY)
              .map((s) => ({ href: categoryHref(locale, key, s.key), name: localName(s as Category, locale) }));
          } catch {
            return [];
          }
        }),
      );

      return {
        id: g.id,
        title: g.title[locale],
        lead: g.lead?.[locale],
        tiles,
        subcats: subLists.flat(),
        link: g.link ? { href: `/${locale}${g.link.path}`, label: g.link.label[locale] } : undefined,
      };
    }),
  ).then((list) => list.filter((g) => g.tiles.length > 0));
}

function Tiles({ tiles, cols, sizes, width }: {
  tiles: ResolvedTile[];
  cols: string;
  sizes: string;
  width: ImgWidth;
}) {
  return (
    <ul className={`grid ${cols} gap-3 md:gap-4`}>
      {tiles.map((t) => (
        <li key={t.href}>
          <Link href={t.href} prefetch={false} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            {/* Место под фото зарезервировано заранее — плитки не прыгают, пока
                картинка догружается. */}
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-cream-200">
              {t.image && (
                <CdnImg
                  src={t.image}
                  alt=""
                  width={width}
                  srcSetWidths={[256, 640]}
                  sizes={sizes}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              )}
            </div>
            <span className="block mt-2 font-semibold leading-snug text-ink-900 group-hover:text-brand-700 transition-colors">
              {t.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Сетка под число плиток: три плитки в шестиколоночной сетке оставляли бы
// полряда пустым.
function gridFor(n: number, half: boolean): { cols: string; sizes: string } {
  if (half) return { cols: 'grid-cols-2', sizes: '(min-width: 768px) 25vw, 45vw' };
  if (n <= 3) return { cols: 'grid-cols-2 sm:grid-cols-3', sizes: '(min-width: 640px) 33vw, 45vw' };
  if (n === 4) return { cols: 'grid-cols-2 sm:grid-cols-4', sizes: '(min-width: 640px) 25vw, 45vw' };
  return { cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6', sizes: '(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 45vw' };
}

function GroupBlock({ g, half, subcatsLabel }: { g: ResolvedGroup; half: boolean; subcatsLabel: string }) {
  return (
    <section aria-labelledby={`group-${g.id}`}>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-1.5">
        <h2 id={`group-${g.id}`} className="text-2xl md:text-3xl font-bold text-ink-900">{g.title}</h2>
        {g.link && (
          <Link href={g.link.href} className="text-brand-700 font-semibold hover:underline whitespace-nowrap">
            {g.link.label}
          </Link>
        )}
      </div>
      {g.lead && <p className="text-ink-600 max-w-2xl mb-5">{g.lead}</p>}

      <Tiles
        tiles={g.tiles}
        {...gridFor(g.tiles.length, half)}
        width={256}
      />

      {g.subcats.length > 0 && (
        <nav aria-label={`${g.title}: ${subcatsLabel}`} className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {g.subcats.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  prefetch={false}
                  className="inline-block px-3 py-1.5 rounded-full bg-surface border border-ink-200 text-sm text-ink-700
                             hover:border-brand-400 hover:text-brand-700 transition-colors"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  );
}

export default async function Welcome({ locale }: { locale: Locale }) {
  const tr = translations[locale].home;
  const c = COPY[locale];
  const groups = await resolveGroups(locale);

  // Широкие блоки — сезон и еда (много плиток), остальные по два в ряд.
  const WIDE = new Set(['season', 'food']);
  const wide = groups.filter((g) => WIDE.has(g.id));
  const halves = groups.filter((g) => !WIDE.has(g.id));

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Первый экран: текст рисуется сразу, он и есть LCP. */}
        <section className="pt-8 pb-10 md:pt-16 md:pb-14 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-ink-900 leading-tight max-w-3xl mx-auto">
            {tr.heroTitle}
          </h1>
          <p className="mt-4 text-base md:text-lg text-ink-700 max-w-2xl mx-auto leading-relaxed">
            {tr.heroSubtitle}
          </p>

          {/* Обычная форма: работает без JS и ведёт в каталог с поиском. */}
          <form action={`/${locale}/catalog`} method="get" role="search" className="mt-7 max-w-xl mx-auto flex gap-2">
            <label htmlFor="welcome-search" className="sr-only">{c.searchLabel}</label>
            <input
              id="welcome-search"
              name="search"
              type="search"
              minLength={2}
              required
              placeholder={c.searchPlaceholder}
              className="flex-1 min-w-0 px-5 py-3 rounded-full bg-surface border border-ink-200 text-ink-900
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="shrink-0 px-5 py-3 rounded-full bg-brand-600 text-on-brand font-bold
                         hover:bg-brand-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {c.find}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href={`/${locale}/catalog`} className="font-semibold text-brand-700 hover:underline">
              {c.allProducts}
            </Link>
            <span className="text-sm text-ink-600">{tr.delivery}</span>
          </div>
        </section>

        <div className="space-y-14">
          {wide.map((g) => <GroupBlock key={g.id} g={g} half={false} subcatsLabel={c.subcats} />)}

          {halves.length > 0 && (
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-14">
              {halves.map((g) => <GroupBlock key={g.id} g={g} half subcatsLabel={c.subcats} />)}
            </div>
          )}
        </div>

        <ProducersSection locale={locale} />
        <RegionsSection locale={locale} />
        <BlogSection locale={locale} />
        <ProducerCTASection locale={locale} />
      </div>
    </div>
  );
}
