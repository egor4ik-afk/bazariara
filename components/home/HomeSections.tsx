// FILE: components/home/HomeSections.tsx
//
// Блоки главной из ТЗ раздел 14: «Наши производители», «Из регионов Грузии»
// и призыв для фермеров внизу. Серверные компоненты — данные берутся из БД
// напрямую, без клиентского фетча.

import Link from 'next/link';
import sql from '@/lib/db';
import ProducerApplicationForm from '@/components/ProducerApplicationForm';
import { plural } from '@/lib/plural';

type Locale = 'ru' | 'en' | 'ka';

const COPY = {
  ru: {
    producersTitle: 'Наши производители',
    producersLead: 'Небольшие хозяйства, пасеки и винодельни. У каждого своя земля, свой сезон и свой вкус.',
    producersAll: 'Все производители',
    regionsTitle: 'Из регионов Грузии',
    regionsLead: 'Мёд из Рачи и Кахетии, чай из Гурии и Аджарии, специи из Самегрело. Вкус здесь зависит от того, где вырос продукт.',
    products: 'товаров',
    producers: 'производителей',
  },
  en: {
    producersTitle: 'Our producers',
    producersLead: 'Small farms, apiaries and wineries. Each has its own land, season and taste.',
    producersAll: 'All producers',
    regionsTitle: 'From the regions of Georgia',
    regionsLead: 'Honey from Racha and Kakheti, tea from Guria and Adjara, spices from Samegrelo. Here taste depends on where a product grew.',
    products: 'products',
    producers: 'producers',
  },
  ka: {
    producersTitle: 'ჩვენი მწარმოებლები',
    producersLead: 'მცირე მეურნეობები, საფუტკრეები და მარნები. თითოეულს თავისი მიწა, სეზონი და გემო აქვს.',
    producersAll: 'ყველა მწარმოებელი',
    regionsTitle: 'საქართველოს რეგიონებიდან',
    regionsLead: 'თაფლი რაჭიდან და კახეთიდან, ჩაი გურიიდან და აჭარიდან, სანელებლები სამეგრელოდან.',
    products: 'პროდუქტი',
    producers: 'მწარმოებელი',
  },
} as const;

/* ─────────────────────────── Производители ─────────────────────────── */

export async function ProducersSection({ locale }: { locale: Locale }) {
  const c = COPY[locale];

  let rows: any[] = [];
  try {
    rows = await sql`
      SELECT p.slug, p.name, p.name_en, p.name_ka, p.image_url, p.locality,
             p.description, p.description_en, p.description_ka,
             r.name AS region_name, r.name_en AS region_name_en, r.name_ka AS region_name_ka,
             (SELECT COUNT(*)::int FROM products x
              WHERE x.producer_id = p.id AND x.source = 'gorgia') AS product_count
      FROM producers p
      LEFT JOIN regions r ON r.id = p.region_id
      WHERE p.status = 'active'
      ORDER BY p.sort_order, p.name
      LIMIT 6
    `;
  } catch (e) {
    console.error('ProducersSection:', e);
  }

  // Пустой блок на главной хуже, чем его отсутствие.
  if (rows.length === 0) return null;

  const name = (p: any) =>
    locale === 'en' ? (p.name_en || p.name) : locale === 'ka' ? (p.name_ka || p.name) : p.name;
  const region = (p: any) =>
    locale === 'en' ? (p.region_name_en || p.region_name)
    : locale === 'ka' ? (p.region_name_ka || p.region_name) : p.region_name;
  const desc = (p: any) => {
    const d = locale === 'en' ? (p.description_en || p.description)
            : locale === 'ka' ? (p.description_ka || p.description) : p.description;
    return d ? String(d).split('\n\n')[0] : '';
  };

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
        <h2 className="text-2xl md:text-3xl font-bold text-ink-900">{c.producersTitle}</h2>
        <Link href={`/${locale}/farmers`} className="text-brand-700 font-semibold hover:underline whitespace-nowrap">
          {c.producersAll} →
        </Link>
      </div>
      <p className="text-ink-600 max-w-2xl mb-6">{c.producersLead}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rows.map((p) => (
          <Link
            key={p.slug}
            href={`/${locale}/farmers/${p.slug}`}
            className="group flex gap-4 p-4 bg-surface rounded-2xl border border-ink-200
                       shadow-card hover:shadow-cardHover hover:border-brand-300 transition-all"
          >
            <div className="w-20 h-20 rounded-xl bg-cream-200 overflow-hidden shrink-0">
              {p.image_url
                ? <img src={p.image_url} alt={name(p)} className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center text-2xl" aria-hidden="true">🌿</div>}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
                {name(p)}
              </h3>
              {(region(p) || p.locality) && (
                <p className="text-xs text-ink-500 mb-1">
                  {[region(p), p.locality].filter(Boolean).join(', ')}
                </p>
              )}
              {desc(p) && <p className="text-sm text-ink-600 clamp-2">{desc(p)}</p>}
              <p className="text-xs font-semibold text-brand-700 mt-1.5">
                {/* «0 товаров» у нового фермера выглядело как брошенная
                    страница — показываем «скоро» */}
                {p.product_count > 0
                  ? plural(p.product_count, 'products', locale)
                  : (locale === 'en' ? 'Coming soon' : locale === 'ka' ? 'მალე' : 'Скоро в продаже')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── Регионы ───────────────────────────── */

export async function RegionsSection({ locale }: { locale: Locale }) {
  const c = COPY[locale];

  let rows: any[] = [];
  try {
    // Показываем только те регионы, где реально что-то есть: пустая плитка
    // ведёт на пустую страницу и портит впечатление и поведенческие.
    rows = await sql`
      SELECT r.slug, r.name, r.name_en, r.name_ka, r.image_url,
             (SELECT COUNT(*)::int FROM producers p
              WHERE p.region_id = r.id AND p.status = 'active') AS producer_count,
             (SELECT COUNT(*)::int FROM products x
              WHERE x.region_id = r.id AND x.source = 'gorgia') AS product_count
      FROM regions r
      WHERE r.is_active
      ORDER BY r.sort_order
    `;
    rows = rows.filter((r) => r.producer_count > 0 || r.product_count > 0);
  } catch (e) {
    console.error('RegionsSection:', e);
  }

  if (rows.length === 0) return null;

  const name = (r: any) =>
    locale === 'en' ? (r.name_en || r.name) : locale === 'ka' ? (r.name_ka || r.name) : r.name;

  return (
    <section className="mt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-ink-900 mb-2">{c.regionsTitle}</h2>
      <p className="text-ink-600 max-w-2xl mb-6">{c.regionsLead}</p>

      <div className="flex flex-wrap gap-3">
        {rows.map((r) => (
          <Link
            key={r.slug}
            href={`/${locale}/regions/${r.slug}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface
                       border border-ink-200 hover:border-brand-400 hover:bg-brand-50
                       transition-colors"
          >
            <span className="font-semibold text-ink-900">{name(r)}</span>
            <span className="text-xs text-ink-500">
              {r.product_count > 0 ? plural(r.product_count, 'products', locale) : plural(r.producer_count, 'producers', locale)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────── Блог ────────────────────────── */

export async function BlogSection({ locale }: { locale: Locale }) {
  const L = {
    ru: { title: 'Путеводитель по Грузии', all: 'Все статьи',
          lead: 'Маршруты, регионы и практические советы — что посмотреть, что попробовать и что увезти с собой.' },
    en: { title: 'Georgia travel guide', all: 'All articles',
          lead: 'Routes, regions and practical advice — what to see, what to try and what to take home.' },
    ka: { title: 'საქართველოს გზამკვლევი', all: 'ყველა სტატია',
          lead: 'მარშრუტები, რეგიონები და პრაქტიკული რჩევები.' },
  }[locale];

  let posts: any[] = [];
  try {
    posts = await sql`
      SELECT slug, title, title_en, title_ka, excerpt, excerpt_en, excerpt_ka,
             cover_url, published_at
      FROM posts WHERE status = 'published'
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT 3
    `;
  } catch (e) {
    console.error('BlogSection:', e);
  }

  // Пока нет ни одной опубликованной статьи, блок не показываем:
  // пустой раздел на главной выглядит как недоделанный сайт.
  if (posts.length === 0) return null;

  const pick = (p: any, f: string) =>
    locale === 'en' ? (p[`${f}_en`] || p[f]) : locale === 'ka' ? (p[`${f}_ka`] || p[f]) : p[f];

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
        <h2 className="text-2xl md:text-3xl font-bold text-ink-900">{L.title}</h2>
        <Link href={`/${locale}/blog`} className="text-brand-700 font-semibold hover:underline whitespace-nowrap">
          {L.all} →
        </Link>
      </div>
      <p className="text-ink-600 max-w-2xl mb-6">{L.lead}</p>

      <div className="grid sm:grid-cols-3 gap-5">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/${locale}/blog/${p.slug}`}
            className="group bg-surface rounded-2xl border border-ink-200 shadow-card
                       overflow-hidden hover:shadow-cardHover hover:border-brand-300 transition-all"
          >
            {p.cover_url && (
              <div className="aspect-[16/9] bg-cream-200 overflow-hidden">
                <img src={p.cover_url} alt="" loading="lazy"
                     className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
            )}
            <div className="p-5">
              <h3 className="font-bold text-ink-900 mb-2 group-hover:text-brand-700 transition-colors">
                {pick(p, 'title')}
              </h3>
              {pick(p, 'excerpt') && (
                <p className="text-sm text-ink-600 leading-relaxed clamp-2">{pick(p, 'excerpt')}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────── Призыв для производителей ───────────────────── */

export function ProducerCTASection({ locale }: { locale: Locale }) {
  return (
    <section className="mt-16 mb-4">
      <ProducerApplicationForm locale={locale} />
    </section>
  );
}
