'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product, CartProduct } from '@/lib/types';
import { ShoppingCartIcon, ArrowLeftIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import ProductImageSlider from '@/components/ProductImageSlider';
import { getProductById } from './page';

const getAllImages = (product: Product): string[] => {
  const images = [];
  if (product.image_url) images.push(product.image_url);
  if (product.image_url2) images.push(product.image_url2);
  if (product.image_url3) images.push(product.image_url3);
  if (product.image_url4) images.push(product.image_url4);
  if (product.image_url5) images.push(product.image_url5);
  return images;
};

function RelatedProductCard({ category, id }: { category: string; id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchProduct = async () => {
      const fetchedProduct = await getProductById(id);
      setProduct(fetchedProduct as Product);
    };
    fetchProduct();
  }, [id]);

  const getTitle = () => {
    if (!product) return '';
    if (language === 'en') return product.name_en || product.name;
    if (language === 'ru') return product.name_ru || product.name;
    if (language === 'ka') return product.name_ka || product.name;
    return product.name;
  };

  if (!product) {
    return (
      <div className="bg-white rounded-lg p-4">
        <div className="w-full h-32 bg-ink-100 animate-pulse rounded-lg mb-4" />
        <div className="w-3/4 h-4 bg-ink-100 animate-pulse rounded-md mx-auto" />
      </div>
    );
  }

  return (
    <Link href={`/${language}/products/${product.categoryKey}/${product.id}`}
      className="block bg-white rounded-lg hover:shadow-brand-600/20 transition-shadow duration-300">
      <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
        <Image
          src={product.image_url || '/placeholder.png'}
          alt={getTitle()}
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="p-4">
        <h4 className="font-bold text-md truncate text-ink-900">{getTitle()}</h4>
        <p className="text-brand-700 font-semibold">{product.price} ₾</p>
      </div>
    </Link>
  );
}


export default function ProductDetailClient({ product }: { product: Product }) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const { t, language } = useLanguage();
  const router = useRouter();

  const cartItem = cartItems.find(item => item.id === String(product.id));
  const [inputValue, setInputValue] = useState(cartItem ? cartItem.quantity : 1);

  useEffect(() => {
    setInputValue(cartItem ? cartItem.quantity : 1);
  }, [cartItem]);

  const getTitle = () => (language === 'en' ? product.name_en : language === 'ru' ? product.name_ru : product.name) || product.name;
  const getDescription = () => (language === 'en' ? product.description_en : language === 'ru' ? product.description_ru : product.description) || product.description;
  const getCategory = () => (language === 'en' ? product.category_name_en : language === 'ru' ? product.category_name_ru : product.category_name) || product.category_name;
  const getSubCategory = () => (language === 'en' ? product.sub_category_name_en : language === 'ru' ? product.sub_category_name_ru : product.sub_category_name) || product.sub_category_name;

  const images = getAllImages(product);

  const cartProduct: CartProduct = {
    id: String(product.id),
    title: product.name,
    title_en: product.name_en || '',
    price: product.price as number,
    category: product.categoryKey,
    image_url: product.image_url || '/placeholder.png',
    categoryKey: product.categoryKey, 
  };

  const handleAddToCart = () => { if (product.price !== null) addToCart(cartProduct); };
  const handleIncrease = () => { if (cartItem) updateQuantity(cartItem.id, cartItem.quantity + 1, cartItem.category); };
  const handleDecrease = () => { if (cartItem) { if (cartItem.quantity > 1) updateQuantity(cartItem.id, cartItem.quantity - 1, cartItem.category); else removeFromCart(cartItem.id, cartItem.category); } };
  const handleBlur = () => { if (!cartItem) return; const q = parseInt(inputValue.toString(), 10); if (!isNaN(q) && q > 0) updateQuantity(cartItem.id, q, cartItem.category); else setInputValue(cartItem.quantity); };

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-ink-600 hover:text-ink-900 transition-colors">
            <ArrowLeftIcon className="h-5 w-5" />
            {t('product.backToProducts')}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* Галерея */}
            <div className="p-4 md:p-6 bg-gray-800/10">
              <ProductImageSlider images={images} alt={getTitle()} priority={true} />
            </div>

            <div className="p-6 md:p-8 flex flex-col justify-between">
              <div> 
                <div className="flex flex-col-reverse">
                  <p className="text-sm text-brand-700 font-semibold mb-2 mt-2">
                    {getCategory()}{getSubCategory() && ` / ${getSubCategory()}`}
                  </p>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-ink-900">{getTitle()}</h1>
                </div>

                <div className="flex justify-between items-center my-5">
                  <p className="text-4xl font-bold text-brand-700">{product.price} ₾</p>
                  {product.in_stock && (
                    <span className="text-sm font-semibold text-green-400 bg-green-900/50 rounded-full px-3 py-1">{t('product.inStock')}</span>
                  )}
                </div>

                {getDescription() && (
                  <div className="text-ink-700 leading-relaxed space-y-4 whitespace-pre-line mb-6">
                    {getDescription()!.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                )}
              </div>

              {product.price !== null && product.in_stock && (
                <div className="mt-auto pt-6">
                  {cartItem ? (
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-semibold">{t('product.inCart')}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={handleDecrease} className="p-3 rounded-full bg-ink-100 hover:bg-ink-200 transition-colors"><MinusIcon className="h-5 w-5" /></button>
                        <input type="number" value={inputValue} min="1" onChange={e => setInputValue(e.target.value)} onBlur={handleBlur} className="text-xl font-bold w-12 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md" />
                        <button onClick={handleIncrease} className="p-3 rounded-full bg-ink-100 hover:bg-ink-200 transition-colors"><PlusIcon className="h-5 w-5" /></button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={handleAddToCart} className="w-full flex items-center justify-center px-4 py-4 font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-600/30">
                      <ShoppingCartIcon className="h-6 w-6 mr-3" />
                      {t('product.addToCart')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Информация */}
            <div className="p-8 flex flex-col justify-center">
              <p className="text-sm text-brand-700 font-semibold mb-2">
                {getCategory()}{getSubCategory() && ` / ${getSubCategory()}`}
              </p>
              <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 text-ink-900">{getTitle()}</h1>
              <div className="flex justify-between items-center mb-6">
                <p className="text-4xl font-bold text-brand-700">{product.price} ₾</p>
                {product.in_stock && (
                  <span className="text-sm font-semibold text-brand-600 bg-green-900/50 rounded-full px-3 py-1">{t('product.inStock')}</span>
                )}
              </div>
              {getDescription() && (
                <div className="text-ink-700 leading-relaxed space-y-4 whitespace-pre-line">
                  {getDescription()!.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
              )}
            </div>
          </div>
        </div>

        {product.links && product.links.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold mb-4 text-ink-900">{t('product.relatedProducts')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {product.links.map((link, i) => {
                try {
                  const [category, id] = link.split('/');
                  return <RelatedProductCard key={i} category={category} id={id} />;
                } catch (error) {
                  console.error('Error parsing related product link:', link, error);
                  return null;
                }
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
