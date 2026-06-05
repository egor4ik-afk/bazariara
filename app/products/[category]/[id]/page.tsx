import sql from '@/lib/db';
import ProductDetailClient from './client-page';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export const revalidate = 600;

type Params = Promise<{ category: string; id: string }>;

type NeonProduct = {
  id: number;
  external_id: string;
  source_url: string | null;
  gorgia_url: string | null;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  name_ka: string | null;
  description: string | null;
  description_ru: string | null;
  description_en: string | null;
  description_ka: string | null;
  price: number | null;
  currency: string;
  in_stock: boolean;
  category: string | null;
  category_en: string | null;
  category_ka: string | null;
  sub_category: string | null;
  sub_category_en: string | null;
  sub_category_ka: string | null;
  image_url: string | null;
  images: string[] | string | null;
};

function toClientProduct(p: NeonProduct, category: string, id: string) {
  let imgs: string[] = [];
  if (typeof p.images === 'string') {
    try { imgs = JSON.parse(p.images); } catch { imgs = []; }
  } else if (Array.isArray(p.images)) {
    imgs = p.images;
  }

  const allImages = [p.image_url, ...imgs].filter(Boolean) as string[];
  const uniqueImages = [...new Set(allImages)];

  const trueCategoryKey = p.external_id ? p.external_id.split('_')[0] : category;

  return {
    id:              String(p.id),
    external_id:     p.external_id,
    categoryKey:     category,
    trueCategoryKey: trueCategoryKey,

    title:           p.name_ru || p.name_en || p.name_ka || p.name,
    title_en:        p.name_en || undefined,
    title_ka:        p.name_ka || undefined,

    description:     p.description_ru || p.description || undefined,
    description_en:  p.description_en || undefined,
    description_ka:  p.description_ka || undefined,

    category:        p.category || '',
    category_en:     p.category_en || undefined,
    category_ka:     p.category_ka || undefined,

    sub_category:    p.sub_category || undefined,
    sub_category_en: p.sub_category_en || undefined,
    sub_category_ka: p.sub_category_ka || undefined,

    price:           p.price ?? 0,
    in_stock:        p.in_stock,
    currency:        p.currency,

    image_url:       uniqueImages[0] || undefined,
    image_urls:      uniqueImages.slice(1),
  };
}

async function getProduct(category: string, id: string) {
  try {
    const rows = await sql`
      SELECT
        id, external_id, source_url, gorgia_url,
        name, name_ru, name_en, name_ka,
        description, description_ru, description_en, description_ka,
        price, currency, in_stock,
        category, category_en, category_ka,
        sub_category, sub_category_en, sub_category_ka,
        image_url, images
      FROM products
      WHERE source = 'gorgia'
        AND id = ${Number(id)}
      LIMIT 1
    `;

    if (!rows[0]) return null;

    return toClientProduct(rows[0] as unknown as NeonProduct, category, id);
  } catch (err) {
    console.error('Ошибка при получении товара:', err);
    return null;
  }
}

// ─── Единая точка получения продукта с редиректом ──────────────────────────
// Вынесена отдельно, чтобы и generateMetadata, и ProductDetailPage
// использовали одну логику — без дублирования кода.
//
// Возвращает продукт ТОЛЬКО если category в URL совпадает с trueCategoryKey.
// Если не совпадает — бросает redirect() до рендера, поэтому Googlebot
// никогда не получит 200 на неканоничном URL.
async function getProductOrRedirect(category: string, id: string) {
  const product = await getProduct(category, id);

  if (!product) notFound();

  // Если category в URL не совпадает с реальным ключом из БД —
  // делаем 308 Permanent Redirect до того, как начнётся рендер метадаты.
  // Это закрывает источник "Duplicate without user-selected canonical" в GSC:
  // неправильный URL возвращает 308, правильный — 200 с canonical на себя.
  if (category !== product.trueCategoryKey) {
    redirect(`/products/${product.trueCategoryKey}/${product.id}`);
  }

  return product;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, id } = await params;

  // redirect() внутри generateMetadata работает в Next.js App Router —
  // он прерывает рендер и возвращает 308 до отдачи HTML.
  const product = await getProductOrRedirect(category, id);

  const title       = `${product.title} — купить в Тбилиси с доставкой`;
  const rawDesc     = product.description
    ? `${product.description.slice(0, 110)} — доставка по Тбилиси. Цена: ${product.price} ₾.`
    : `Купите ${product.title} за ${product.price} ₾ с доставкой по Тбилиси за 2 часа.`;
  const description = rawDesc.slice(0, 160);
  const image       = product.image_url || '/default-product.png';

  // canonical всегда на trueCategoryKey — совпадает с URL после редиректа
  const canonicalUrl = `https://bazariara.ge/products/${product.trueCategoryKey}/${product.id}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      locale:      'ru_GE',
      url:         canonicalUrl,
      siteName:    'BAZARI ARA',
      type:        'website',
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: product.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [image],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { category, id } = await params;

  // redirect уже случился в generateMetadata если нужен —
  // здесь продукт гарантированно на правильном URL
  const product = await getProductOrRedirect(category, id);

  const allImages = [product.image_url, ...(product.image_urls || [])].filter(Boolean) as string[];
  const absoluteImageUrls = allImages.map(url =>
    url.startsWith('/') ? `https://bazariara.ge${url}` : url
  );

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type':    'Product',
    name:       product.title,
    image:      absoluteImageUrls,
    description: product.description || '',
    sku:        product.id.toString(),
    category:   product.category,
    brand:      { '@type': 'Brand', name: 'BAZARI ARA' },
    offers: {
      '@type':           'Offer',
      priceCurrency:     'GEL',
      price:             product.price,
      priceValidUntil:   nextYear.toISOString().split('T')[0],
      availability:      product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url:               `https://bazariara.ge/products/${product.trueCategoryKey}/${product.id}`,
      seller: {
        '@type': 'Organization',
        name:    'BAZARI ARA',
        logo:    { '@type': 'ImageObject', url: 'https://bazariara.ge/android-chrome-512x512.png' },
      },
      shippingDetails: {
        '@type':       'OfferShippingDetails',
        shippingRate:  { '@type': 'MonetaryAmount', value: '20', currency: 'GEL' },
        shippingDestination: {
          '@type':         'DefinedRegion',
          addressCountry:  'GE',
          addressRegion:   'Тбилиси',
        },
      },
      hasMerchantReturnPolicy: {
        '@type':                'MerchantReturnPolicy',
        applicableCountry:      'GE',
        returnPolicyCategory:   'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays:     14,
        returnMethod:           'https://schema.org/ReturnByMail',
        returnFees:             'https://schema.org/FreeReturn',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}