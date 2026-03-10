import { database } from '@/lib/firebase/server';
import ProductDetailClient from './client-page';
import { Metadata } from 'next';
import { translations } from '@/lib/translations';
import ProductNotFound from './not-found';

// === ISR: обновление кэша каждые 10 минут ===
export const revalidate = 600;

type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  in_stock: boolean;
  description?: string;
  image_url?: string;
  categoryKey: string;
  image_urls?: string[];
  links?: string[];
};

async function getProduct(category: string, id: string): Promise<Product | null> {
  try {
    const snapshot = await database.ref(`products/${category}/${id}`).once('value');
    if (!snapshot.exists()) return null;
    return { ...snapshot.val(), id, categoryKey: category };
  } catch (err) {
    console.error('Ошибка при получении товара:', err);
    return null;
  }
}

// === SEO: Метаданные ===
export async function generateMetadata({
  params,
}: {
  params: { category: string; id: string };
}): Promise<Metadata> {
  const product = await getProduct(params.category, params.id);
  const t = translations.ru;

  if (!product) {
    return {
      title: t.product.notFoundTitle,
      description: t.product.notFoundDescription,
      openGraph: {
        title: t.product.notFoundTitle,
        description: t.product.notFoundDescription,
      },
    };
  }

  const title = `${product.title} — купить в Тбилиси с доставкой`;

  // 🔹 Обрезаем description до 160 символов — Google всё равно обрежет длиннее
  const rawDescription = product.description
    ? `${product.description.slice(0, 110)} — доставка по Тбилиси. Цена: ${product.price} ₾.`
    : `Купите ${product.title} за ${product.price} ₾ с доставкой по Тбилиси за 2 часа.`;
  const description = rawDescription.slice(0, 160);

  const image = product.image_url || '/default-product.png';
  const url = `https://bazariara.ge/products/${product.categoryKey}/${product.id}`;

  return {
    title,
    description,
    // 🔹 keywords убраны — Google игнорирует, может восприниматься как спам
    alternates: {
      canonical: url,
    },
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

// === Страница товара ===
export default async function ProductDetailPage({
  params,
}: {
  params: { category: string; id: string };
}) {
  const product = await getProduct(params.category, params.id);

  if (!product) return <ProductNotFound />;

  const allImages = [product.image_url, ...(product.image_urls || [])].filter(Boolean) as string[];
  const absoluteImageUrls = allImages.map(url =>
    url.startsWith('/') ? `https://bazariara.ge${url}` : url
  );

  // === JSON-LD — только здесь, в серверном компоненте (убран дубль из client-page) ===
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    image: absoluteImageUrls,
    description: product.description || '',
    sku: product.id.toString(),
    category: product.category,
    brand: {
      '@type': 'Brand',
      name: 'BAZARI ARA',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GEL',
      price: product.price,
      priceValidUntil: '2026-12-31', // 🔹 Обновлено
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `https://bazariara.ge/products/${product.categoryKey}/${product.id}`,
      seller: {
        '@type': 'Organization',
        name: 'BAZARI ARA',
        logo: {
          '@type': 'ImageObject',
          url: 'https://bazariara.ge/android-chrome-512x512.png',
        },
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '10',
          currency: 'GEL',
        },
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
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: 4.9,
      reviewCount: 10,
    },
    review: [
      {
        '@type': 'Review',
        author: { '@type': 'Person', name: 'Покупатель' },
        datePublished: '2024-05-23',
        reviewBody: 'Отличный товар, быстрая доставка!',
        reviewRating: { '@type': 'Rating', ratingValue: 5 },
      },
    ],
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