// FILE: app/blog/page.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import sql from '@/lib/db';

export const revalidate = 300;
type Locale = 'ru' | 'en' | 'ka';

const COPY = {
  ru: { title: 'Путеводитель по Грузии — маршруты, советы, что привезти | Bazari Ara',
        description: 'Маршруты по Грузии, советы путешественникам, хайкинг, регионы и что стоит попробовать и привезти из разных мест.',
        h1: 'Путеводитель по Грузии',
        lead: 'Маршруты, регионы, практические советы и то, что стоит попробовать на месте или увезти с собой.',
        empty: 'Первые статьи появятся совсем скоро.' },
  en: { title: 'Georgia Travel Guide — routes, tips, what to bring home | Bazari Ara',
        description: 'Routes across Georgia, travel tips, hiking, regions and what is worth trying and taking home.',
        h1: 'Georgia travel guide',
        lead: 'Routes, regions, practical advice and what is worth trying on the spot or taking home.',
        empty: 'The first articles are coming soon.' },
  ka: { title: 'საქართველოს გზამკვლევი — მარშრუტები და რჩევები | Bazari Ara',
        description: 'მარშრუტები საქართველოში, რჩევები მოგზაურებს, ლაშქრობა, რეგიონები.',
        h1: 'საქართველოს გზამკვლევი',
        lead: 'მარშრუტები, რეგიონები, პრაქტიკული რჩევები და ის, რაც ღირს გასასინჯად.',
        empty: 'პირველი სტატიები მალე გამოჩნდება.' },
} as const;

function getLocale(h: Headers): Locale {
  const l = h.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];
  const url = `https://bazariara.ge/${locale}/blog`;
  return {
    title: c.title, description: c.description,
    alternates: {
      canonical: url,
      languages: {
        ru: 'https://bazariara.ge/ru/blog',
        en: 'https://bazariara.ge/en/blog',
        ka: 'https://bazariara.ge/ka/blog',
      },
    },
  };
}

export default async function BlogIndex() {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];

  let posts: any[] = [];
  try {
    posts = await sql`
      SELECT slug, title, title_en, title_ka, excerpt, excerpt_en, excerpt_ka,
             cover_url, published_at, author_name
      FROM posts
      WHERE status = 'published'
      ORDER BY published_at DESC NULLS LAST, id DESC
      LIMIT 50
    `;
  } catch (e) {
    console.error('BlogIndex:', e);
  }

  const pick = (p: any, f: string) =>
    locale === 'en' ? (p[`${f}_en`] || p[f]) : locale === 'ka' ? (p[`${f}_ka`] || p[f]) : p[f];

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">{c.h1}</h1>
        <p className="text-ink-700 max-w-3xl mb-10 leading-relaxed">{c.lead}</p>

        {posts.length === 0 ? (
          <p className="text-ink-500">{c.empty}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/${locale}/blog/${p.slug}`}
                className="group bg-surface rounded-2xl border border-ink-200 shadow-card
                           overflow-hidden flex flex-col hover:shadow-cardHover
                           hover:border-brand-300 transition-all"
              >
                {p.cover_url && (
                  <div className="aspect-[16/9] bg-cream-200 overflow-hidden">
                    <img src={p.cover_url} alt="" className="w-full h-full object-cover
                         transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-grow">
                  <h2 className="text-lg font-bold mb-2 group-hover:text-brand-700 transition-colors">
                    {pick(p, 'title')}
                  </h2>
                  {pick(p, 'excerpt') && (
                    <p className="text-sm text-ink-600 leading-relaxed">{pick(p, 'excerpt')}</p>
                  )}
                  {p.published_at && (
                    <time className="mt-auto pt-4 text-xs text-ink-500" dateTime={p.published_at}>
                      {new Date(p.published_at).toLocaleDateString(
                        locale === 'ru' ? 'ru-RU' : locale === 'ka' ? 'ka-GE' : 'en-GB',
                        { day: 'numeric', month: 'long', year: 'numeric' }
                      )}
                    </time>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
