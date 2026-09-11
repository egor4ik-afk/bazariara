// FILE: app/regions/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import sql from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/types';

export const revalidate = 600;

type Locale = 'ru' | 'en' | 'ka';

function getLocale(h: Headers): Locale {
  const l = h.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

async function getRegion(slug: string) {
  try {
    const rows = await sql`
      SELECT id, slug, name, name_en, name_ka, description, image_url
      FROM regions WHERE slug = ${slug} AND is_active LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (e) {
    console.error('getRegion:', e);
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const region = await getRegion(slug);
  if (!region) return { title: 'Регион не найден | BAZARI ARA' };

  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const name = locale === 'en' ? (region.name_en || region.name)
             : locale === 'ka' ? (region.name_ka || region.name)
             : region.name;

  // Шаблон из таблицы 12 ТЗ.
  const title = `Товары из ${name} — продукты и производители | Bazari Ara`;
  const description = `Продукты и товары от производителей ${name}: мёд, чай, специи и другие локальные продукты. Доставка по Тбилиси.`;
  const url = `https://bazariara.ge/${locale}/regions/${slug}`;

  return {
    title, description,
    alternates: {
      canonical: url,
      languages: {
        ru: `https://bazariara.ge/ru/regions/${slug}`,
        en: `https://bazariara.ge/en/regions/${slug}`,
        ka: `https://bazariara.ge/ka/regions/${slug}`,
      },
    },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function RegionPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const region = await getRegion(slug);
  if (!region) notFound();

  const hdrs = await headers();
  const locale = getLocale(hdrs);

  const name = locale === 'en' ? (region.name_en || region.name)
             : locale === 'ka' ? (region.name_ka || region.name)
             : region.name;

  let producers: any[] = [];
  let rows: any[] = [];
  try {
    producers = await sql`
      SELECT slug, name, name_en, name_ka, image_url, locality,
             (SELECT COUNT(*)::int FROM products x
              WHERE x.producer_id = producers.id AND x.source = 'gorgia') AS product_count
      FROM producers
      WHERE region_id = ${region.id} AND status = 'active'
      ORDER BY sort_order, name
    `;

    // Товары региона — и те, что помечены напрямую, и те, что пришли
    // через производителя из этого региона.
    rows = await sql`
      SELECT DISTINCT ON (p.id)
             p.id, p.external_id, p.category_key,
             COALESCE(p.name_ru, p.name) AS name,
             p.name_ru, p.name_en, p.name_ka,
             p.price, p.currency, p.in_stock, p.availability,
             p.category, p.category_en, p.category_ka,
             p.sub_category, p.sub_category_en, p.sub_category_ka,
             p.farmer_slug, p.farmer_name, p.image_url, p.images
      FROM products p
      LEFT JOIN producers pr ON pr.id = p.producer_id
      WHERE p.source = 'gorgia' AND p.image_url IS NOT NULL
        AND (p.region_id = ${region.id} OR pr.region_id = ${region.id})
      ORDER BY p.id, p.in_stock DESC
      LIMIT 48
    `;
  } catch (e) {
    console.error('RegionPage:', e);
  }

  const products = rows.map((p: any) => ({
    ...p, id: Number(p.id), price: p.price !== null ? Number(p.price) : null,
  })) as unknown as Product[];

  const pName = (p: any) =>
    locale === 'en' ? (p.name_en || p.name) : locale === 'ka' ? (p.name_ka || p.name) : p.name;

  const L = {
    producers: locale === 'en' ? 'Producers of the region' : locale === 'ka' ? 'რეგიონის მწარმოებლები' : 'Производители региона',
    products:  locale === 'en' ? 'Products from the region' : locale === 'ka' ? 'რეგიონის პროდუქცია' : 'Товары из региона',
    empty:     locale === 'en' ? 'Nothing from this region yet.' : locale === 'ka' ? 'ამ რეგიონიდან ჯერ არაფერია.' : 'Из этого региона пока ничего нет.',
    items:     locale === 'en' ? 'products' : locale === 'ka' ? 'პროდუქტი' : 'товаров',
    all:       locale === 'en' ? 'Regions' : locale === 'ka' ? 'რეგიონები' : 'Регионы',
  };

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <nav className="text-sm text-ink-500 mb-6">
          <Link href={`/${locale}`} className="hover:text-brand-700">BAZARI ARA</Link>
          {' / '}
          <Link href={`/${locale}/regions`} className="hover:text-brand-700">{L.all}</Link>
          {' / '}
          <span className="text-ink-700">{name}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{name}</h1>
        {region.description && (
          <p className="text-ink-700 leading-relaxed max-w-3xl mb-10">{region.description}</p>
        )}

        {producers.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-5">{L.producers}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {producers.map((p) => (
                <Link
                  key={p.slug}
                  href={`/${locale}/farmers/${p.slug}`}
                  className="group flex gap-4 p-4 bg-surface rounded-2xl border border-ink-200
                             shadow-card hover:shadow-cardHover hover:border-brand-300 transition-all"
                >
                  <div className="w-16 h-16 rounded-xl bg-cream-200 overflow-hidden shrink-0">
                    {p.image_url
                      ? <img src={p.image_url} alt={pName(p)} className="w-full h-full object-cover" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center text-xl" aria-hidden="true">🌿</div>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold group-hover:text-brand-700 transition-colors">{pName(p)}</h3>
                    {p.locality && <p className="text-xs text-ink-500">{p.locality}</p>}
                    <p className="text-xs font-semibold text-brand-700 mt-1">
                      {p.product_count} {L.items}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-5">{L.products}</h2>
          {products.length === 0 ? (
            <p className="text-ink-500">{L.empty}</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
