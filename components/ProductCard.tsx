'use client';

import Link from 'next/link';
import QuantityInput from '@/components/QuantityInput';
import ProductImageSlider from '@/components/ProductImageSlider';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product as NeonProduct, getAllImages } from '@/lib/types';
import { Product as CartProduct } from '@/contexts/CartContext';

interface ProductCardProps {
  product: NeonProduct;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const { language, t } = useLanguage();

  const name =
    language === 'ru' ? (product.name_ru || product.name_en || product.name_ka || product.name) :
    language === 'en' ? (product.name_en || product.name_ru || product.name_ka || product.name) :
    language === 'ka' ? (product.name_ka || product.name_ru || product.name_en || product.name) :
    product.name;

  const category =
    language === 'en' ? (product.category_en || product.category || '') :
    language === 'ka' ? (product.category_ka || product.category || '') :
    (product.category || '');

  const images = getAllImages(product);

  const catKey = (product as any).category_key
    || (product.external_id ? product.external_id.split('_')[0] : 'unknown');

  const prodId = String(product.id);
  const farmerName = (product as any).farmer_name as string | undefined;
  const farmerSlug = (product as any).farmer_slug as string | undefined;

  // Цена может быть NULL — у вина и всего, что «скоро в продаже».
  // Раньше в этом месте выводился ноль, и получалось «0 ₾» с активной
  // кнопкой покупки.
  const hasPrice = product.price !== null && product.price !== undefined && Number(product.price) > 0;

  const cartProduct: CartProduct = {
    id:              String(product.id),
    title:           name,
    title_en:        product.name_en || undefined,
    title_ka:        product.name_ka || undefined,
    price:           product.price ?? 0,
    image_url:       product.image_url || undefined,
    category:        product.category || '',
    category_en:     product.category_en || undefined,
    category_ka:     product.category_ka || undefined,
    categoryKey:     catKey,
    description:     product.description_ru || product.description || undefined,
    description_en:  product.description_en || undefined,
    description_ka:  product.description_ka || undefined,
    sub_category:    product.sub_category || undefined,
    sub_category_en: product.sub_category_en || undefined,
    sub_category_ka: product.sub_category_ka || undefined,
    subCategoryKey:  product.sub_category
      ? product.sub_category.toLowerCase().replace(/\s+/g, '-')
      : undefined,
    in_stock:        product.in_stock,
  };

  return (
    <div className="bg-surface rounded-2xl border border-ink-200 shadow-card overflow-hidden
                    flex flex-col group transition-all duration-300
                    hover:shadow-cardHover hover:border-brand-300">
      <div className="relative flex-grow">
        {/* Плашка фермера: главный аргумент витрины — товар от конкретного
            хозяйства, а не безымянная позиция из прайса. */}
        {farmerName && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                             bg-surface/95 backdrop-blur-sm border border-brand-200
                             text-[11px] font-semibold text-brand-700 shadow-sm">
              <span aria-hidden="true">🌿</span>
              {farmerName}
            </span>
          </div>
        )}

        {!product.in_stock && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2.5 py-1 rounded-full bg-clay text-on-brand
                             text-[11px] font-semibold shadow-sm">
              {hasPrice ? t('product.outOfStock') : t('product.comingSoon')}
            </span>
          </div>
        )}

        <Link
          prefetch={false}
          href={`/${language}/products/${catKey}/${prodId}`}
          className="block h-full"
        >
          <div className="bg-cream-200">
            <ProductImageSlider images={images} alt={name} priority={index < 4} />
          </div>

          <div className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
              {category}
            </p>
            <h3 className="text-[15px] font-bold leading-snug text-ink-900 clamp-2 mb-3
                           group-hover:text-brand-700 transition-colors duration-200">
              {name}
            </h3>

            <div className="flex items-baseline justify-between gap-2">
              {hasPrice ? (
                <p className="text-xl font-extrabold text-ink-900 whitespace-nowrap">
                  {product.price} <span className="text-brand-600">₾</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-ink-500">
                  {t('product.priceOnRequest')}
                </p>
              )}

              {product.in_stock && (
                <span className="text-[12px] font-semibold text-brand-600 shrink-0">
                  {t('product.inStock')}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 pb-4 mt-auto">
        {hasPrice && product.in_stock ? (
          <QuantityInput product={cartProduct} />
        ) : (
          <Link
            href={farmerSlug ? `/${language}/farmers/${farmerSlug}` : `/${language}/products/${catKey}/${prodId}`}
            className="block w-full text-center py-2.5 rounded-full border border-brand-300
                       text-brand-700 text-sm font-semibold
                       hover:bg-brand-50 transition-colors duration-200"
          >
            {t('product.learnMore')}
          </Link>
        )}
      </div>
    </div>
  );
}
