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

  // ✅ Учитываем все языки с fallback
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

  // category_key из БД или fallback на external_id
  const catKey = (product as any).category_key
    || (product.external_id ? product.external_id.split('_')[0] : 'unknown');

  const prodId = String(product.id);

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
    <div className="bg-gray-800/40 rounded-xl shadow-lg overflow-hidden flex flex-col group transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl hover:shadow-lime-500/20">
      <div className="relative flex-grow">
        <Link prefetch={false} href={`/products/${catKey}/${prodId}`} className="block h-full">
          <ProductImageSlider images={images} alt={name} priority={index < 4} />
          <div className="p-5">
            <h3 className="text-xl font-bold mb-2 truncate group-hover:text-lime-400 transition-colors duration-300">
              {name}
            </h3>
            <p className="text-gray-400 text-sm mb-3">{category}</p>
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-baseline gap-2 mr-auto">
                <p className="text-2xl font-semibold text-lime-500 whitespace-nowrap">
                  {product.price} ₾
                </p>
              </div>
              {product.in_stock && (
                <span className="text-sm font-semibold text-green-400 shrink-0">
                  {t('product.inStock')}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
      <div className="p-5 pt-0 mt-auto">
        <QuantityInput product={cartProduct} />
      </div>
    </div>
  );
}