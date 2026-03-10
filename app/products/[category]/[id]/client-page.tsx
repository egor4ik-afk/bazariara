'use client';

import { useCart } from '@/contexts/CartContext';
import { ShoppingCartIcon, ArrowLeftIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

type Product = {
  id: string;
  title: string;
  title_en?: string;
  category: string;
  category_en?: string;
  price: number;
  in_stock: boolean;
  description?: string;
  description_en?: string;
  image_url?: string;
  categoryKey: string;
  image_urls?: string[];
  links?: string[];
  sub_category?: string;
  sub_category_en?: string;
  subCategoryKey?: string;
};

// === Загрузка связанного товара ===
async function fetchProduct(category: string, id: string): Promise<Product | null> {
  try {
    const response = await fetch(`/api/products/${category}/${id}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Failed to fetch related product', error);
    return null;
  }
}

// === Карточка связанного товара ===
function RelatedProductCard({
  category,
  id,
  language,
}: {
  category: string;
  id: string;
  language: 'ru' | 'en';
}) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProduct(category, id).then(setProduct);
  }, [category, id]);

  if (!product) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-4 text-center">
        <div className="w-full h-32 bg-gray-700 animate-pulse rounded-lg mb-4" />
        <div className="w-3/4 h-4 bg-gray-700 animate-pulse rounded-md mx-auto" />
      </div>
    );
  }

  const displayTitle =
    language === 'en' && product.title_en ? product.title_en : product.title;

  return (
    <Link
      href={`/products/${product.categoryKey}/${product.id}`}
      className="block bg-gray-800 rounded-lg shadow-md hover:shadow-lime-500/20 transition-shadow duration-300"
    >
      {/* 🔹 next/image вместо <img> — лучше для LCP и CLS */}
      <div className="relative w-full h-32">
        <Image
          src={product.image_url || '/placeholder.png'}
          alt={displayTitle}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover rounded-t-lg"
        />
      </div>
      <div className="p-4">
        <h4 className="font-bold text-md truncate text-white">{displayTitle}</h4>
        <p className="text-lime-400 font-semibold">{product.price} ₾</p>
      </div>
    </Link>
  );
}

// === Главный компонент страницы товара ===
export default function ProductDetailClient({ product }: { product: Product }) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const router = useRouter();
  const { t, language } = useLanguage();

  const displayTitle =
    language === 'en' && product.title_en ? product.title_en : product.title;
  const displayCategory =
    language === 'en' && product.category_en ? product.category_en : product.category;
  const displaySubCategory =
    language === 'en' && product.sub_category_en ? product.sub_category_en : product.sub_category;
  const displayDescription =
    language === 'en' && product.description_en ? product.description_en : product.description;

  const cartItem = cartItems.find(
    item => item.id === product.id && item.category === product.category
  );
  const [inputValue, setInputValue] = useState<string | number>('');

  useEffect(() => {
    if (cartItem) setInputValue(cartItem.quantity);
  }, [cartItem]);

  const allImages = [product.image_url, ...(product.image_urls || [])].filter(Boolean) as string[];
  const uniqueImageUrls = [...new Set(allImages)];
  const hasMultipleImages = uniqueImageUrls.length > 1;

  const handleAddToCart = () => addToCart(product);

  const handleIncreaseQuantity = () => {
    if (cartItem) {
      const newQuantity = cartItem.quantity + 1;
      setInputValue(newQuantity);
      updateQuantity(cartItem.id, newQuantity, cartItem.category);
    }
  };

  const handleDecreaseQuantity = () => {
    if (cartItem) {
      if (cartItem.quantity > 1) {
        const newQuantity = cartItem.quantity - 1;
        setInputValue(newQuantity);
        updateQuantity(cartItem.id, newQuantity, cartItem.category);
      } else {
        removeFromCart(cartItem.id, cartItem.category);
      }
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    if (cartItem) {
      const newQuantity = parseInt(inputValue.toString(), 10);
      if (!isNaN(newQuantity) && newQuantity > 0) {
        updateQuantity(cartItem.id, newQuantity, cartItem.category);
      } else {
        setInputValue(cartItem.quantity);
      }
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      {/* 🔹 JSON-LD убран отсюда — он уже есть в серверном page.tsx, дубль вредит SEO */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            {t('product.backToProducts')}
          </button>
        </div>

        <div className="bg-gray-800/40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* === Галерея изображений === */}
            <div className="p-4">
              {hasMultipleImages ? (
                <Swiper
                  modules={[Pagination]}
                  pagination={{ clickable: true }}
                  className="w-full h-[400px] rounded-lg shadow-lg"
                  loop={true}
                >
                  {uniqueImageUrls.map((url, index) => (
                    <SwiperSlide key={index} className="relative">
                      {/* 🔹 next/image + priority для первого слайда (LCP) */}
                      <Image
                        src={url}
                        alt={`${displayTitle} - ${t('product.photo', { number: index + 1 })}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                        priority={index === 0}
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                // 🔹 next/image + priority для единственного фото (LCP)
                <div className="relative w-full h-[400px] rounded-lg shadow-lg overflow-hidden">
                  <Image
                    src={product.image_url || '/placeholder.png'}
                    alt={displayTitle}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </div>
              )}
            </div>

            {/* === Информация о товаре === */}
            <div className="p-8 flex flex-col justify-center">
              <div>
                <p className="text-sm text-lime-400 font-semibold mb-2">
                  {displayCategory}
                  {displaySubCategory && ` / ${displaySubCategory}`}
                </p>

                <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 text-gray-100">
                  {displayTitle}
                </h1>

                <div className="flex justify-between items-center mb-6">
                  <p className="text-4xl font-bold text-lime-500">{product.price} ₾</p>
                  {product.in_stock && (
                    <span className="text-sm font-semibold text-green-400 bg-green-900/50 rounded-full px-3 py-1">
                      {t('product.inStock')}
                    </span>
                  )}
                </div>

                {displayDescription && (
                  <div className="text-gray-300 leading-relaxed space-y-4 whitespace-pre-line">
                    {displayDescription.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8">
                {cartItem ? (
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold">{t('product.inCart')}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDecreaseQuantity}
                        className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                      <input
                        type="number"
                        value={inputValue}
                        onChange={handleQuantityChange}
                        onBlur={handleBlur}
                        className="text-xl font-bold w-12 text-center bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-lime-500 rounded-md"
                        min="1"
                      />
                      <button
                        onClick={handleIncreaseQuantity}
                        className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="w-full flex items-center justify-center px-4 py-4 font-bold rounded-lg bg-lime-500 text-gray-900 hover:bg-lime-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-400/40"
                  >
                    <ShoppingCartIcon className="h-6 w-6 mr-3" />
                    {t('product.addToCart')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* === Похожие товары === */}
        {product.links && product.links.length > 0 && (
          <div className="mt-2">
            <h3 className="text-2xl font-bold mb-2 text-white">{t('product.relatedProducts')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {product.links.map((link, index) => {
                try {
                  const url = new URL(link);
                  const parts = url.pathname.split('/');
                  if (parts.length >= 4) {
                    return (
                      <RelatedProductCard
                        key={index}
                        category={parts[2]}
                        id={parts[3]}
                        language={language}
                      />
                    );
                  }
                } catch (error) {
                  console.error('Invalid URL in product links', link, error);
                }
                return null;
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}