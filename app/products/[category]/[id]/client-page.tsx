'use client';

import { useCart } from '@/contexts/CartContext';
import { ShoppingCartIcon, ArrowLeftIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export type Product = {
  id: string;
  external_id?: string;
  categoryKey: string;
  title: string;
  title_en?: string;
  title_ka?: string;
  description?: string;
  description_en?: string;
  description_ka?: string;
  category: string;
  category_en?: string;
  category_ka?: string;
  sub_category?: string;
  sub_category_en?: string;
  sub_category_ka?: string;
  price: number;
  in_stock: boolean;
  currency?: string;
  image_url?: string;
  image_urls?: string[];
  links?: string[];
};

function RelatedProductCard({ category, id }: { category: string; id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    fetch(`/api/products/${category}/${id}?lang=${language}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setProduct({
          id: data.id ? String(data.id) : id,
          categoryKey: category,
          title: data.name || data.title || '',
          title_en: data.name_en || data.title_en,
          title_ka: data.name_ka || data.title_ka,
          price: data.price ?? 0,
          image_url: data.image_url,
          in_stock: data.in_stock,
          category: data.category || '',
          category_en: data.category_en,
          category_ka: data.category_ka,
        });
      })
      .catch(console.error);
  }, [category, id, language]);

  const getTitle = () => {
    if (!product) return '';
    if (language === 'ka') return product.title_ka || product.title;
    if (language === 'en') return product.title_en || product.title;
    return product.title;
  };

  if (!product) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="w-full h-32 bg-gray-700 animate-pulse rounded-lg mb-4" />
        <div className="w-3/4 h-4 bg-gray-700 animate-pulse rounded-md mx-auto" />
      </div>
    );
  }

  return (
    <Link href={`/products/${product.categoryKey}/${product.id}`}
      className="block bg-gray-800 rounded-lg hover:shadow-lime-500/20 transition-shadow duration-300">
      <div className="w-full h-32 overflow-hidden rounded-t-lg">
        <img
          src={product.image_url || '/placeholder.png'}
          alt={getTitle()}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h4 className="font-bold text-md truncate text-white">{getTitle()}</h4>
        <p className="text-lime-400 font-semibold">{product.price} ₾</p>
      </div>
    </Link>
  );
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const router = useRouter();
  const { t, language } = useLanguage();

  const getTitle = () => {
    if (language === 'ka') return product.title_ka || product.title;
    if (language === 'en') return product.title_en || product.title;
    return product.title;
  };

  const getDescription = () => {
    if (language === 'ka') return product.description_ka || product.description;
    if (language === 'en') return product.description_en || product.description;
    return product.description;
  };

  const getCategory = () => {
    if (language === 'ka') return product.category_ka || product.category;
    if (language === 'en') return product.category_en || product.category;
    return product.category;
  };

  const getSubCategory = () => {
    if (language === 'ka') return product.sub_category_ka || product.sub_category;
    if (language === 'en') return product.sub_category_en || product.sub_category;
    return product.sub_category;
  };

  const cartProduct = { ...product, title: getTitle() };
  const cartItem = cartItems.find(i => i.id === product.id && i.category === product.category);
  const [inputValue, setInputValue] = useState<string | number>('');

  useEffect(() => { if (cartItem) setInputValue(cartItem.quantity); }, [cartItem]);

  const allImages = [product.image_url, ...(product.image_urls || [])].filter(Boolean) as string[];
  const uniqueImages = [...new Set(allImages)];

  const handleAddToCart = () => addToCart(cartProduct);
  const handleIncrease = () => { if (!cartItem) return; const q = cartItem.quantity + 1; setInputValue(q); updateQuantity(cartItem.id, q, cartItem.category); };
  const handleDecrease = () => { if (!cartItem) return; if (cartItem.quantity > 1) { const q = cartItem.quantity - 1; setInputValue(q); updateQuantity(cartItem.id, q, cartItem.category); } else removeFromCart(cartItem.id, cartItem.category); };
  const handleBlur = () => { if (!cartItem) return; const q = parseInt(inputValue.toString(), 10); if (!isNaN(q) && q > 0) updateQuantity(cartItem.id, q, cartItem.category); else setInputValue(cartItem.quantity); };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeftIcon className="h-5 w-5" />
            {t('product.backToProducts')}
          </button>
        </div>

        <div className="bg-gray-800/40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* Галерея */}
            <div className="p-4">
              {uniqueImages.length > 1 ? (
                <Swiper modules={[Pagination]} pagination={{ clickable: true }} className="w-full h-[400px] rounded-lg shadow-lg" loop={true}>
                  {uniqueImages.map((url, i) => (
                    <SwiperSlide key={i} className="h-full w-full">
                      <img src={url} alt={`${getTitle()} — фото ${i + 1}`} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="w-full h-[400px] rounded-lg shadow-lg overflow-hidden">
                  <img src={product.image_url || '/placeholder.png'} alt={getTitle()} className="w-full h-full object-cover" loading="eager" />
                </div>
              )}

              {/* Добавить в корзину — перенесено под галерею */}
              <div className="mt-4">
                {cartItem ? (
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold">{t('product.inCart')}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={handleDecrease} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"><MinusIcon className="h-5 w-5" /></button>
                      <input type="number" value={inputValue} min="1" onChange={e => setInputValue(e.target.value)} onBlur={handleBlur} className="text-xl font-bold w-12 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-lime-500 rounded-md" />
                      <button onClick={handleIncrease} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"><PlusIcon className="h-5 w-5" /></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={handleAddToCart} className="w-full flex items-center justify-center px-4 py-4 font-bold rounded-lg bg-lime-500 text-gray-900 hover:bg-lime-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-500/30">
                    <ShoppingCartIcon className="h-6 w-6 mr-3" />
                    {t('product.addToCart')}
                  </button>
                )}
              </div>
            </div>

            {/* Информация */}
            <div className="p-8 flex flex-col justify-center">
              <p className="text-sm text-lime-400 font-semibold mb-2">
                {getCategory()}{getSubCategory() && ` / ${getSubCategory()}`}
              </p>
              <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 text-gray-100">{getTitle()}</h1>
              <div className="flex justify-between items-center mb-6">
                <p className="text-4xl font-bold text-lime-500">{product.price} ₾</p>
                {product.in_stock && (
                  <span className="text-sm font-semibold text-green-400 bg-green-900/50 rounded-full px-3 py-1">{t('product.inStock')}</span>
                )}
              </div>
              {getDescription() && (
                <div className="text-gray-300 leading-relaxed space-y-4 whitespace-pre-line">
                  {getDescription()!.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
              )}
            </div>
          </div>
        </div>

        {product.links && product.links.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold mb-4 text-white">{t('product.relatedProducts')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {product.links.map((link, i) => {
                try {
                  const parts = new URL(link).pathname.split('/');
                  if (parts.length >= 4) return <RelatedProductCard key={i} category={parts[2]} id={parts[3]} />;
                } catch { }
                return null;
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}