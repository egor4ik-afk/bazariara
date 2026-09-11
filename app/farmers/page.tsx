// FILE: app/farmers/page.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import sql from '@/lib/db';

export const revalidate = 300;

type Locale = 'ru' | 'en' | 'ka';

const COPY = {
  ru: {
    title: 'Товары грузинских производителей — BAZARI ARA',
    description: 'Продукты и товары небольших грузинских производителей с информацией о регионах и ассортименте.',
    h1: 'Наши производители',
    intro: 'Небольшие хозяйства, пасеки, чайные плантации и винодельни Грузии. У каждого — свой регион, своя история и свой ассортимент. Мы знакомимся с производителями лично и отбираем то, что стоит попробовать.',
    products: 'товаров',
    empty: 'Производители появятся здесь совсем скоро.',
  },
  en: {
    title: 'Georgian Producers — BAZARI ARA',
    description: 'Products from small Georgian producers, with details on their regions and ranges.',
    h1: 'Our producers',
    intro: 'Small farms, apiaries, tea plantations and wineries across Georgia. Each has its own region, story and range. We meet the producers in person and pick what is worth trying.',
    products: 'products',
    empty: 'Producers will appear here shortly.',
  },
  ka: {
    title: 'ქართველი მწარმოებლები — BAZARI ARA',
    description: 'პროდუქცია მცირე ქართველი მწარმოებლებისგან, რეგიონებისა და ასორტიმენტის შესახებ ინფორმაციით.',
    h1: 'ჩვენი მწარმოებლები',
    intro: 'მცირე მეურნეობები, საფუტკრეები, ჩაის პლანტაციები და მარნები საქართველოს მასშტაბით. თითოეულს აქვს თავისი რეგიონი, ისტორია და ასორტიმენტი.',
    products: 'პროდუქტი',
    empty: 'მწარმოებლები მალე გამოჩნდებიან.',
  },
} as const;

function getLocale(h: Headers): Locale {
  const l = h.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];
  const url = `https://bazariara.ge/${locale}/farmers`;

  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: url,
      languages: {
        ru: 'https://bazariara.ge/ru/farmers',
        en: 'https://bazariara.ge/en/farmers',
        ka: 'https://bazariara.ge/ka/farmers',
      },
    },
  };
}

export default async function FarmersPage() {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];

  let producers: any[] = [];
  try {
    producers = await sql`
      SELECT p.slug, p.name, p.name_en, p.name_ka, p.locality, p.image_url,
             p.description, p.description_en, p.description_ka,
             r.name AS region_name, r.name_en AS region_name_en, r.name_ka AS region_name_ka,
             (SELECT COUNT(*)::int FROM products x
              WHERE x.producer_id = p.id AND x.source = 'gorgia') AS product_count
      FROM producers p
      LEFT JOIN regions r ON r.id = p.region_id
      WHERE p.status = 'active'
      ORDER BY p.sort_order, p.name
    `;
  } catch (e) {
    console.error('Ошибка загрузки производителей:', e);
  }

  const name = (p: any) =>
    locale === 'en' ? (p.name_en || p.name) : locale === 'ka' ? (p.name_ka || p.name) : p.name;
  const region = (p: any) =>
    locale === 'en' ? (p.region_name_en || p.region_name) : locale === 'ka' ? (p.region_name_ka || p.region_name) : p.region_name;
  const desc = (p: any) => {
    const d = locale === 'en' ? (p.description_en || p.description)
            : locale === 'ka' ? (p.description_ka || p.description)
            : p.description;
    return d ? String(d).split('\n\n')[0] : '';
  };

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{c.h1}</h1>
        <p className="text-ink-700 leading-relaxed max-w-3xl mb-10">{c.intro}</p>

        {producers.length === 0 ? (
          <p className="text-ink-500">{c.empty}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {producers.map((p) => (
              <Link
                key={p.slug}
                href={`/${locale}/farmers/${p.slug}`}
                className="group bg-surface rounded-2xl border border-ink-200 shadow-card
                           overflow-hidden flex flex-col hover:shadow-cardHover
                           hover:border-brand-300 transition-all duration-300"
              >
                <div className="aspect-[16/10] bg-cream-200 overflow-hidden">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={name(p)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl" aria-hidden="true">🌿</div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <h2 className="text-lg font-bold mb-1 group-hover:text-brand-700 transition-colors">
                    {name(p)}
                  </h2>

                  {(region(p) || p.locality) && (
                    <p className="text-sm text-ink-500 mb-3">
                      <span aria-hidden="true">📍 </span>
                      {[region(p), p.locality].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {desc(p) && (
                    <p className="text-sm text-ink-600 leading-relaxed clamp-2 mb-4">{desc(p)}</p>
                  )}

                  <span className="mt-auto text-sm font-semibold text-brand-700">
                    {p.product_count} {c.products} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
