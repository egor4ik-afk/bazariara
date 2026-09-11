// FILE: app/regions/page.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import sql from '@/lib/db';

export const revalidate = 600;
type Locale = 'ru' | 'en' | 'ka';

const COPY = {
  ru: { title: 'Регионы Грузии — продукты и производители | Bazari Ara',
        description: 'Мёд, чай, вино и специи по регионам Грузии: Кахетия, Гурия, Аджария, Рача, Самегрело и другие.',
        h1: 'Регионы Грузии',
        lead: 'Вкус грузинского продукта зависит от того, где он вырос. Каштановый мёд из Рачи и акациевый из Имерети — это два разных мёда, а не один с разными этикетками. Здесь собраны регионы, из которых к нам приезжают продукты.',
        products: 'товаров', producers: 'производителей', empty: 'Регионы появятся по мере наполнения каталога.' },
  en: { title: 'Regions of Georgia — products and producers | Bazari Ara',
        description: 'Honey, tea, wine and spices by Georgian region: Kakheti, Guria, Adjara, Racha, Samegrelo and more.',
        h1: 'Regions of Georgia',
        lead: 'The taste of a Georgian product depends on where it grew. Chestnut honey from Racha and acacia honey from Imereti are two different honeys, not one with different labels.',
        products: 'products', producers: 'producers', empty: 'Regions will appear as the catalogue grows.' },
  ka: { title: 'საქართველოს რეგიონები — პროდუქცია და მწარმოებლები | Bazari Ara',
        description: 'თაფლი, ჩაი, ღვინო და სანელებლები საქართველოს რეგიონების მიხედვით.',
        h1: 'საქართველოს რეგიონები',
        lead: 'ქართული პროდუქტის გემო დამოკიდებულია იმაზე, სად გაიზარდა. რაჭული წაბლის თაფლი და იმერული აკაციის თაფლი ორი სხვადასხვა თაფლია.',
        products: 'პროდუქტი', producers: 'მწარმოებელი', empty: 'რეგიონები მალე გამოჩნდება.' },
} as const;

function getLocale(h: Headers): Locale {
  const l = h.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];
  const url = `https://bazariara.ge/${locale}/regions`;
  return {
    title: c.title, description: c.description,
    alternates: {
      canonical: url,
      languages: {
        ru: 'https://bazariara.ge/ru/regions',
        en: 'https://bazariara.ge/en/regions',
        ka: 'https://bazariara.ge/ka/regions',
      },
    },
  };
}

export default async function RegionsPage() {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];

  let rows: any[] = [];
  try {
    rows = await sql`
      SELECT r.slug, r.name, r.name_en, r.name_ka, r.image_url, r.description,
             (SELECT COUNT(*)::int FROM producers p
              WHERE p.region_id = r.id AND p.status = 'active') AS producer_count,
             (SELECT COUNT(*)::int FROM products x
              WHERE x.region_id = r.id AND x.source = 'gorgia') AS product_count
      FROM regions r WHERE r.is_active ORDER BY r.sort_order
    `;
    // Регион без единого товара и производителя ведёт на пустую страницу —
    // такие в список не пускаем, но в БД они остаются для будущего.
    rows = rows.filter((r) => r.producer_count > 0 || r.product_count > 0);
  } catch (e) {
    console.error('RegionsPage:', e);
  }

  const name = (r: any) =>
    locale === 'en' ? (r.name_en || r.name) : locale === 'ka' ? (r.name_ka || r.name) : r.name;

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{c.h1}</h1>
        <p className="text-ink-700 leading-relaxed max-w-3xl mb-10">{c.lead}</p>

        {rows.length === 0 ? (
          <p className="text-ink-500">{c.empty}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((r) => (
              <Link
                key={r.slug}
                href={`/${locale}/regions/${r.slug}`}
                className="group p-5 bg-surface rounded-2xl border border-ink-200 shadow-card
                           hover:shadow-cardHover hover:border-brand-300 transition-all"
              >
                <h2 className="text-lg font-bold mb-1 group-hover:text-brand-700 transition-colors">
                  {name(r)}
                </h2>
                <p className="text-sm text-ink-500">
                  {r.producer_count > 0 && `${r.producer_count} ${c.producers}`}
                  {r.producer_count > 0 && r.product_count > 0 && ' · '}
                  {r.product_count > 0 && `${r.product_count} ${c.products}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
