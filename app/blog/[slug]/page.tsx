// FILE: app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import sql from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/types';

export const revalidate = 300;
type Locale = 'ru' | 'en' | 'ka';

function getLocale(h: Headers): Locale {
  const l = h.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

async function getPost(slug: string) {
  try {
    const rows = await sql`
      SELECT * FROM posts WHERE slug = ${slug} AND status = 'published' LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (e) {
    console.error('getPost:', e);
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Статья не найдена | BAZARI ARA' };

  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const title = post.seo_title || pick(post, 'title', locale);
  const description = post.seo_description || pick(post, 'excerpt', locale) || '';
  const url = `https://bazariara.ge/${locale}/blog/${slug}`;

  return {
    title, description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, type: 'article',
      publishedTime: post.published_at || undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

function pick(p: any, field: string, locale: Locale): string {
  if (locale === 'en') return p[`${field}_en`] || p[field] || '';
  if (locale === 'ka') return p[`${field}_ka`] || p[field] || '';
  return p[field] || '';
}

/**
 * Минимальный рендер Markdown: заголовки, жирный, курсив, ссылки, списки.
 *
 * Полноценную библиотеку не тащим: статьи пишет один человек в известном
 * формате, а `react-markdown` с плагинами — это +60 КБ в бандл ради
 * пяти конструкций. Если формат усложнится, замена займёт полчаса.
 */
function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const blocks = esc(md).split(/\n{2,}/);

  return blocks.map((block) => {
    const b = block.trim();
    if (!b) return '';

    if (b.startsWith('### ')) return `<h3>${inline(b.slice(4))}</h3>`;
    if (b.startsWith('## '))  return `<h2>${inline(b.slice(3))}</h2>`;
    if (b.startsWith('# '))   return `<h2>${inline(b.slice(2))}</h2>`;

    if (/^[-*] /m.test(b)) {
      const items = b.split('\n')
        .filter((l) => /^[-*] /.test(l.trim()))
        .map((l) => `<li>${inline(l.trim().slice(2))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    if (/^\d+\. /m.test(b)) {
      const items = b.split('\n')
        .filter((l) => /^\d+\. /.test(l.trim()))
        .map((l) => `<li>${inline(l.trim().replace(/^\d+\.\s*/, ''))}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }

    if (b.startsWith('&gt; ')) return `<blockquote>${inline(b.slice(5))}</blockquote>`;

    return `<p>${inline(b).replace(/\n/g, '<br/>')}</p>`;
  }).join('');
}

function inline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export default async function PostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const hdrs = await headers();
  const locale = getLocale(hdrs);

  // Связанные сущности (ТЗ 6, врезка «Ключевая CMS-функция» и раздел 11).
  let regions: any[] = [], producers: any[] = [], rows: any[] = [];
  try {
    [regions, producers, rows] = await Promise.all([
      sql`SELECT r.slug, r.name, r.name_en, r.name_ka FROM post_regions pr
          JOIN regions r ON r.id = pr.region_id WHERE pr.post_id = ${post.id}`,
      sql`SELECT p.slug, p.name, p.name_en, p.name_ka FROM post_producers pp
          JOIN producers p ON p.id = pp.producer_id
          WHERE pp.post_id = ${post.id} AND p.status = 'active'`,
      sql`SELECT p.id, p.external_id, p.category_key,
                 COALESCE(p.name_ru, p.name) AS name,
                 p.name_ru, p.name_en, p.name_ka,
                 p.price, p.currency, p.in_stock, p.availability,
                 p.category, p.category_en, p.category_ka,
                 p.farmer_slug, p.farmer_name, p.image_url, p.images
          FROM post_products pp
          JOIN products p ON p.id = pp.product_id
          WHERE pp.post_id = ${post.id} AND p.image_url IS NOT NULL
          LIMIT 8`,
    ]);
  } catch (e) {
    console.error('PostPage links:', e);
  }

  const products = rows.map((p: any) => ({
    ...p, id: Number(p.id), price: p.price !== null ? Number(p.price) : null,
  })) as unknown as Product[];

  const title = pick(post, 'title', locale);
  const body  = pick(post, 'body', locale);

  const rName = (r: any) =>
    locale === 'en' ? (r.name_en || r.name) : locale === 'ka' ? (r.name_ka || r.name) : r.name;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: pick(post, 'excerpt', locale),
    image: post.cover_url || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || undefined,
    author: { '@type': 'Organization', name: post.author_name },
    publisher: {
      '@type': 'Organization', name: 'BAZARI ARA',
      logo: { '@type': 'ImageObject', url: 'https://bazariara.ge/android-chrome-512x512.png' },
    },
    mainEntityOfPage: `https://bazariara.ge/${locale}/blog/${slug}`,
  };

  const L = {
    back:      locale === 'en' ? 'Guide' : locale === 'ka' ? 'გზამკვლევი' : 'Путеводитель',
    read:      locale === 'en' ? 'Read also' : locale === 'ka' ? 'ასევე წაიკითხეთ' : 'Смотрите также',
    fromPost:  locale === 'en' ? 'Products from this article' : locale === 'ka' ? 'სტატიის პროდუქცია' : 'Товары из статьи',
  };

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <nav className="text-sm text-ink-500 mb-6">
          <Link href={`/${locale}`} className="hover:text-brand-700">BAZARI ARA</Link>
          {' / '}
          <Link href={`/${locale}/blog`} className="hover:text-brand-700">{L.back}</Link>
        </nav>

        <article className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">{title}</h1>

          {post.published_at && (
            <time className="block text-sm text-ink-500 mb-6" dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString(
                locale === 'ru' ? 'ru-RU' : locale === 'ka' ? 'ka-GE' : 'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' }
              )}
            </time>
          )}

          {post.cover_url && (
            <img src={post.cover_url} alt="" className="w-full rounded-2xl mb-8 bg-cream-200" />
          )}

          <div
            className="post-body text-ink-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
        </article>

        {(regions.length > 0 || producers.length > 0) && (
          <section className="max-w-3xl mt-10 pt-6 border-t border-ink-200">
            <h2 className="text-sm font-bold text-ink-500 uppercase tracking-wide mb-3">{L.read}</h2>
            <div className="flex flex-wrap gap-2">
              {regions.map((r) => (
                <Link key={r.slug} href={`/${locale}/regions/${r.slug}`}
                  className="px-3.5 py-2 rounded-full bg-surface border border-ink-200
                             text-sm font-semibold hover:border-brand-400 hover:bg-brand-50 transition-colors">
                  📍 {rName(r)}
                </Link>
              ))}
              {producers.map((p) => (
                <Link key={p.slug} href={`/${locale}/farmers/${p.slug}`}
                  className="px-3.5 py-2 rounded-full bg-surface border border-ink-200
                             text-sm font-semibold hover:border-brand-400 hover:bg-brand-50 transition-colors">
                  🌿 {rName(p)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {products.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-5">{L.fromPost}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
