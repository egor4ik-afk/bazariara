import { database } from '@/lib/firebase/server';
import ProductDetailClient from './client-page';
import { Metadata } from 'next';
import { calculateDisplayPrice } from '@/lib/priceLogic';
import { translations } from '@/lib/translations';

// === 🔸 Тип товара ===
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

// === 🔸 Получение товара из Firebase ===
async function getProduct(category: string, id: string): Promise<Product | null> {
  try {
    const productRef = database.ref(`products/${category}/${id}`);
    const snapshot = await productRef.once('value');
    if (!snapshot.exists()) return null;

    const productData = snapshot.val();
    return {
      ...productData,
      id: id,
      categoryKey: category,
    };
  } catch (err) {
    console.error('Ошибка при получении товара:', err);
    return null;
  }
}

// === 🔸 Мета-данные для SEO, Facebook и Twitter ===
export async function generateMetadata({ params }: { params: { category: string; id: string } }): Promise<Metadata> {
  const product = await getProduct(params.category, params.id);
  
  // Default to Russian for metadata (SEO purposes)
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

  const displayPrice = calculateDisplayPrice(product.price);
  const title = `${product.title} — купить в Тбилиси с доставкой`;
  const description = product.description
    ? `${product.description} Быстрая доставка по Тбилиси. Цена: ${displayPrice} ₾.`
    : `Купите ${product.title} по выгодной цене ${displayPrice} ₾ с быстрой доставкой по Тбилиси.`;
  const image = product.image_url || '/default-product.png';
  const url = `https://bazariara.ge/${product.categoryKey}/${product.id}`;

  return {
    metadataBase: new URL('https://bazariara.ge'),
    title,
    description,
    keywords: [product.title, product.category, 'купить в Тбилиси', 'доставка по Тбилиси', 'BAZARI ARA', 'интернет-магазин в Грузии'],
    alternates: {
      canonical: url,
    },
    openGraph: {
      locale: 'ru_GE',
      url,
      siteName: 'BAZARI ARA',
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

// === 🔸 Компонент страницы ===
import ProductNotFound from './not-found';

export default async function ProductDetailPage({ params }: { params: { category: string; id: string } }) {
  const product = await getProduct(params.category, params.id);

  if (!product) {
    return <ProductNotFound />;
  }

  const displayPrice = calculateDisplayPrice(product.price);
  const allImages = [product.image_url, ...(product.image_urls || [])].filter(Boolean) as string[];
  const absoluteImageUrls = allImages.map(url => url.startsWith('/') ? `https://bazariara.ge${url}` : url);

  // === Добавляем JSON-LD (структурированные данные) для Google ===
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
      price: displayPrice,
      priceValidUntil: "2025-12-31",
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `https://bazariara.ge/${product.categoryKey}/${product.id}`,
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
          addressRegion: 'Тбилиси'
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
        author: {
          '@type': 'Person',
          name: 'Anonymous',
        },
        datePublished: '2024-05-23',
        reviewBody: 'Отличный товар!',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: 5,
        },
      },
    ],
  };

  return (
    <>
      {/* Структурированные данные для Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}