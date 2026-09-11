// FILE: app/farmers/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import sql from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/types';

export const revalidate = 300;

type Producer = {
  id: number;
  slug: string;
  name: string; name_en: string | null; name_ka: string | null;
  locality: string | null;
  description: string | null; description_en: string | null; description_ka: string | null;
  image_url: string | null;
  website: string | null; instagram: string | null; facebook: string | null;
  seo_title: string | null; seo_description: string | null;
  region_slug: string | null;
  region_name: string | null; region_name_en: string | null; region_name_ka: string | null;
};

type Locale = 'ru' | 'en' | 'ka';

function getLocale(h: Headers): Locale {
  const l = h.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

async function getProducer(slug: string): Promise<Producer | null> {
  try {
    const rows = await sql`
      SELECT p.id, p.slug, p.name, p.name_en, p.name_ka, p.locality,
             p.description, p.description_en, p.description_ka,
             p.image_url, p.website, p.instagram, p.facebook,
             p.seo_title, p.seo_description,
             r.slug AS region_slug, r.name AS region_name,
             r.name_en AS region_name_en, r.name_ka AS region_name_ka
      FROM producers p
      LEFT JOIN regions r ON r.id = p.region_id
      WHERE p.slug = ${slug} AND p.status = 'active'
      LIMIT 1
    `;
    return (rows[0] as Producer) ?? null;
  } catch (e) {
    console.error('Ошибка загрузки производителя:', e);
    return null;
  }
}

/**
 * Ассортимент подтягивается по producer_id — список товаров в коде больше
 * не живёт. Новый товар с этим производителем появляется здесь сам,
 * снятый с продажи уходит вниз, но не пропадает: связь в данных остаётся
 * (ТЗ 4.2).
 */
async function getProducts(producerId: number) {
  try {
    return await sql`
      SELECT id, external_id, category_key, source_url,
             COALESCE(name_ru, name) AS name,
             name_ru, name_en, name_ka,
             COALESCE(description_ru, description_en, description_ka) AS description,
             description_ru, description_en, description_ka,
             price, currency, in_stock, availability,
             category, category_en, category_ka,
             sub_category, sub_category_en, sub_category_ka,
             farmer_slug, farmer_name,
             image_url, images
      FROM products
      WHERE producer_id = ${producerId} AND source = 'gorgia'
      ORDER BY in_stock DESC, category_key, id
    `;
  } catch (e) {
    console.error('Ошибка загрузки товаров производителя:', e);
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const producer = await getProducer(slug);
  if (!producer) return { title: 'Производитель не найден | BAZARI ARA' };

  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const name = pick(producer, 'name', locale);
  const region = pickRegion(producer, locale);

  const title = producer.seo_title
    || `${name} — товары производителя${region ? ` из региона ${region}` : ''} | BAZARI ARA`;
  const description = producer.seo_description
    || `Продукты от ${name}${region ? `, ${region}` : ''}. Ассортимент, история хозяйства и доставка по Тбилиси.`;

  const url = `https://bazariara.ge/${locale}/farmers/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ru: `https://bazariara.ge/ru/farmers/${slug}`,
        en: `https://bazariara.ge/en/farmers/${slug}`,
        ka: `https://bazariara.ge/ka/farmers/${slug}`,
      },
    },
    openGraph: {
      title, description, url, type: 'profile',
      images: producer.image_url ? [producer.image_url] : undefined,
    },
  };
}

function pick(p: Producer, field: 'name' | 'description', locale: Locale): string {
  if (locale === 'en') return (p[`${field}_en`] as string) || (p[field] as string) || '';
  if (locale === 'ka') return (p[`${field}_ka`] as string) || (p[field] as string) || '';
  return (p[field] as string) || '';
}

function pickRegion(p: Producer, locale: Locale): string {
  if (!p.region_name) return '';
  if (locale === 'en') return p.region_name_en || p.region_name;
  if (locale === 'ka') return p.region_name_ka || p.region_name;
  return p.region_name;
}

export default async function ProducerPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const producer = await getProducer(slug);
  if (!producer) notFound();

  const hdrs = await headers();
  const locale = getLocale(hdrs);

  const rows = await getProducts(producer.id);
  const products = rows.map((p: any) => ({
    ...p,
    id: Number(p.id),
    price: p.price !== null ? Number(p.price) : null,
  })) as unknown as Product[];

  const name = pick(producer, 'name', locale);
  const description = pick(producer, 'description', locale);
  const region = pickRegion(producer, locale);
  const place = [region, producer.locality].filter(Boolean).join(', ');

  const socials = [
    producer.website   && { label: 'Сайт',      href: producer.website },
    producer.instagram && { label: 'Instagram', href: producer.instagram },
    producer.facebook  && { label: 'Facebook',  href: producer.facebook },
  ].filter(Boolean) as { label: string; href: string }[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description: description?.slice(0, 300),
    url: `https://bazariara.ge/${locale}/farmers/${slug}`,
    image: producer.image_url || undefined,
    address: place
      ? { '@type': 'PostalAddress', addressRegion: region, addressLocality: producer.locality || undefined, addressCountry: 'GE' }
      : undefined,
    sameAs: socials.map((s) => s.href),
  };

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <nav className="text-sm text-ink-500 mb-6">
          <Link href={`/${locale}`} className="hover:text-brand-700">BAZARI ARA</Link>
          {' / '}
          <Link href={`/${locale}/farmers`} className="hover:text-brand-700">
            {locale === 'en' ? 'Producers' : locale === 'ka' ? 'მწარმოებლები' : 'Производители'}
          </Link>
          {' / '}
          <span className="text-ink-700">{name}</span>
        </nav>

        <header className="flex flex-col sm:flex-row gap-6 mb-10">
          {producer.image_url && (
            <img
              src={producer.image_url}
              alt={name}
              className="w-full sm:w-56 h-56 object-cover rounded-2xl bg-cream-200 shrink-0"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{name}</h1>

            {place && (
              <p className="text-ink-600 mb-4">
                <span aria-hidden="true">📍 </span>
                {producer.region_slug ? (
                  <Link href={`/${locale}/regions/${producer.region_slug}`} className="text-brand-700 hover:underline">
                    {region}
                  </Link>
                ) : region}
                {producer.locality && `, ${producer.locality}`}
              </p>
            )}

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="px-3 py-1.5 rounded-full border border-ink-200 bg-surface
                               text-sm font-semibold text-ink-800 hover:border-brand-300"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </header>

        {description && (
          <section className="max-w-3xl mb-12">
            {description.split('\n\n').map((para, i) => (
              <p key={i} className="text-ink-700 leading-relaxed mb-4">{para}</p>
            ))}
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-5">
            {locale === 'en' ? 'Products' : locale === 'ka' ? 'პროდუქცია' : 'Товары производителя'}
            <span className="ml-2 text-base font-semibold text-ink-500">{products.length}</span>
          </h2>

          {products.length === 0 ? (
            <p className="text-ink-500">
              {locale === 'en' ? 'No products available right now.'
                : locale === 'ka' ? 'ამჟამად პროდუქცია არ არის.'
                : 'Сейчас товаров этого производителя нет в наличии.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
