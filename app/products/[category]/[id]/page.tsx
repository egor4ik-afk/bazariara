import sql from '@/lib/db';
import ProductDetailClient from './client-page';
import ProductCard from '@/components/ProductCard'; // <-- ДОБАВЛЕН ИМПОРТ
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Params = Promise<{ category: string; id: string }>;

type NeonProduct = {
  id: number;
  external_id: string | null;
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
  price: any;
  currency: string;
  in_stock: boolean;
  category: string | null;
  category_en: string | null;
  category_ka: string | null;
  category_key: string | null; 
  sub_category: string | null;
  sub_category_en: string | null;
  sub_category_ka: string | null;
  image_url: string | null;
  images: any;
};

function toClientProduct(p: NeonProduct, category: string, id: string) {
  let imgs: string[] = [];
  if (typeof p.images === 'string') {
    try { imgs = JSON.parse(p.images); } catch { imgs = []; }
  } else if (Array.isArray(p.images)) {
    imgs = p.images as string[];
  }

  const allImages = [p.image_url, ...imgs].filter(Boolean) as string[];
  const uniqueImages = [...new Set(allImages)];

  const trueCategoryKey = p.category_key || (p.external_id && p.external_id.includes('_') ? p.external_id.split('_')[0] : category);

  return {
    id:              String(p.id),
    external_id:     p.external_id || undefined,
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

    price:           p.price ? Number(p.price) : 0,
    in_stock:        p.in_stock,
    currency:        p.currency,

    image_url:       uniqueImages[0] || undefined,
    image_urls:      uniqueImages.slice(1),
  };
}

async function getProduct(category: string, id: string) {
  try {
    const numericId = Number(id);
    if (isNaN(numericId)) return null;

    const rows = await sql`
      SELECT
        id, external_id, source_url, gorgia_url,
        name, name_ru, name_en, name_ka,
        description, description_ru, description_en, description_ka,
        price, currency, in_stock,
        category, category_en, category_ka, category_key,
        sub_category, sub_category_en, sub_category_ka,
        image_url, images
      FROM products
      WHERE id = ${numericId}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    return toClientProduct(rows[0] as unknown as NeonProduct, category, id);
  } catch (err) {
    console.error('Ошибка при получении товара из БД:', err);
    return null;
  }
}

// НОВАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ПОХОЖИХ ТОВАРОВ НА ЧИСТОМ SQL
async function getRelatedProducts(categoryKey: string, excludeId: number) {
  try {
    const rows = await sql`
      SELECT
        id, external_id, source_url, gorgia_url,
        name, name_ru, name_en, name_ka,
        description, description_ru, description_en, description_ka,
        price, currency, in_stock,
        category, category_en, category_ka, category_key,
        sub_category, sub_category_en, sub_category_ka,
        image_url, images
      FROM products
      WHERE category_key = ${categoryKey} AND id != ${excludeId}
      LIMIT 4
    `;
    
    if (!rows || rows.length === 0) return [];
    return rows.map(r => toClientProduct(r as unknown as NeonProduct, categoryKey, String(r.id)));
  } catch (err) {
    console.error('Ошибка при получении похожих товаров:', err);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, id } = await params;
  const product = await getProduct(category, id);

  if (!product) {
    return {
      title: 'Товар не найден — BAZARI ARA',
      description: 'Запрошенный товар не существует или был удалён.',
    };
  }

  const title = `${product.title} — купить в Тбилиси с доставкой`;
  const rawDescription = product.description
    ? `${product.description.slice(0, 110)} — доставка по Тбилиси. Цена: ${product.price} ₾.`
    : `Купите ${product.title} за ${product.price} ₾ с доставкой по Тбилиси за 2 часа.`;
  const description = rawDescription.slice(0, 160);
  const image = product.image_url || '/default-product.png';
  const url = `https://bazariara.ge/products/${product.trueCategoryKey}/${product.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      locale: 'ru_GE',
      url,
      siteName: 'BAZARI ARA',
      type: 'website',
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { category, id } = await params;
  const product = await getProduct(category, id);

  if (!product) notFound();

  // ВЫЗЫВАЕМ ПОХОЖИЕ ТОВАРЫ
  const relatedProducts = await getRelatedProducts(product.trueCategoryKey || category, Number(product.id));

  const allImages = [product.image_url, ...(product.image_urls || [])].filter(Boolean) as string[];
  const absoluteImageUrls = allImages.map(url =>
    url.startsWith('/') ? `https://bazariara.ge${url}` : url
  );

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    image: absoluteImageUrls,
    description: product.description || '',
    sku: product.id,
    category: product.category,
    brand: { '@type': 'Brand', name: 'BAZARI ARA' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GEL',
      price: product.price,
      priceValidUntil: nextYear.toISOString().split('T')[0],
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `https://bazariara.ge/products/${product.trueCategoryKey}/${product.id}`,
      seller: {
        '@type': 'Organization',
        name: 'BAZARI ARA',
        logo: { '@type': 'ImageObject', url: 'https://bazariara.ge/android-chrome-512x512.png' },
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: '20', currency: 'GEL' },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'GE',
          addressRegion: 'Тбилиси',
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'GE',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* ОСНОВНОЙ КОНТЕНТ ТОВАРА */}
      <ProductDetailClient product={product} />

      {/* БЛОК РЕКОМЕНДАЦИЙ СНИЗУ */}
      {relatedProducts.length > 0 && (
        <div className="container mx-auto px-4 mt-8 md:mt-16 mb-16 max-w-7xl">
          <h2 className="text-2xl font-bold mb-6 text-ink-900 border-b pb-4">Вам также может понравиться</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p as any} index={0} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}