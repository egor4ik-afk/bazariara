import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product as ProductType, CartProduct } from '@/lib/types';
import { ShoppingCartIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';

interface ProductCardProps {
  product: ProductType;
  index: number;
}

export default function ProductCard({ product, index }: ProductCardProps) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const { language, t } = useLanguage();

  const getTitle = () => {
    if (!product) return '';
    switch (language) {
      case 'en':
        return product.name_en || product.name;
      case 'ru':
        return product.name_ru || product.name;
      case 'ka':
        return product.name_ka || product.name;
      default:
        return product.name;
    }
  };

  const title = getTitle();
  const cartItem = cartItems.find(item => item.id === String(product.id));

  const cartProduct: CartProduct = {
    id: String(product.id),
    title: product.name,
    title_en: product.name_en || '',
    price: product.price as number,
    category: product.categoryKey,
    image_url: product.image_url || '/placeholder.png',
    categoryKey: product.categoryKey,
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.price !== null) {
      addToCart(cartProduct);
    }
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      updateQuantity(cartItem.id, cartItem.quantity + 1, cartItem.category);
    }
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      if (cartItem.quantity > 1) {
        updateQuantity(cartItem.id, cartItem.quantity - 1, cartItem.category);
      } else {
        removeFromCart(cartItem.id, cartItem.category);
      }
    }
  };

  return (
    <Link href={`/products/${product.categoryKey}/${product.id}`} className="group block bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
      <div className="relative w-full h-40 sm:h-48 overflow-hidden">
        <Image
          src={product.image_url || '/placeholder.png'}
          alt={title}
          layout="fill"
          objectFit="cover"
          className="group-hover:scale-110 transition-transform duration-500 ease-in-out"
          priority={index < 4} 
        />
      </div>

      <div className="p-4 flex flex-col justify-between flex-grow">
        <div>
            <h3 className="text-md font-bold text-ink-900 truncate group-hover:text-brand-700 transition-colors">{title}</h3>
        </div>

        <div className="mt-4 flex justify-between items-center">
            <p className="text-lg font-extrabold text-brand-700">{product.price} ₾</p>
            
            {product.price !== null && product.in_stock ? (
            cartItem ? (
                <div className="flex items-center gap-2">
                    <button onClick={handleDecrease} className="p-2 rounded-full bg-cream-100 hover:bg-cream-200 transition-colors">
                        <MinusIcon className="h-4 w-4 text-ink-800" />
                    </button>
                    <span className="text-md font-bold text-ink-900">{cartItem.quantity}</span>
                    <button onClick={handleIncrease} className="p-2 rounded-full bg-cream-100 hover:bg-cream-200 transition-colors">
                        <PlusIcon className="h-4 w-4 text-ink-800" />
                    </button>
                </div>
            ) : (
                <button onClick={handleAddToCart} className="p-2 rounded-full bg-brand-600 text-white hover:bg-brand-500 transition-all transform group-hover:scale-110 shadow-md group-hover:shadow-lg">
                    <ShoppingCartIcon className="h-5 w-5" />
                </button>
            )
            ) : (
                <span className="text-sm font-semibold text-ink-500">{t('product.outOfStock')}</span>
            )}
        </div>
      </div>
    </Link>
  );
}
