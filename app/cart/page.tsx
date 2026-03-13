'use client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

import { useCart, ProductInCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import { useState, useEffect, useRef } from 'react';

const MIN_ORDER_AMOUNT = 30;
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_COST = 10

// Simple Spinner component
const Spinner = () => (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
);

function CartItemQuantityInput({ item, startRemoval }: { item: ProductInCart, startRemoval: (itemId: string, category: string) => void }) {
    const { updateQuantity } = useCart();
    const [inputValue, setInputValue] = useState<string | number>(item.quantity);
    const [isInputActive, setIsInputActive] = useState(false);

    useEffect(() => {
        if (!isInputActive) {
            setInputValue(item.quantity);
        }
    }, [item.quantity, isInputActive]);

    useEffect(() => {
        if (isInputActive) {
            document.body.classList.add('cart-updating');
        } else {
            document.body.classList.remove('cart-updating');
        }
        return () => {
            document.body.classList.remove('cart-updating');
        };
    }, [isInputActive]);

    const handleFocus = () => {
        setIsInputActive(true);
    };

    const handleBlur = () => {
        setIsInputActive(false);
        const newQuantity = parseInt(inputValue.toString(), 10);

        if (!isNaN(newQuantity) && newQuantity > 0) {
            if (newQuantity !== item.quantity) {
                updateQuantity(item.id, newQuantity, item.category);
            }
        } else if (newQuantity <= 0) {
            startRemoval(item.id, item.category);
        } else {
            setInputValue(item.quantity);
        }
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleDecrease = () => {
        const newQuantity = item.quantity - 1;
        if (newQuantity > 0) {
            setInputValue(newQuantity);
            updateQuantity(item.id, newQuantity, item.category);
        } else {
            startRemoval(item.id, item.category);
        }
    };

    const handleIncrease = () => {
        const newQuantity = item.quantity + 1;
        setInputValue(newQuantity);
        updateQuantity(item.id, newQuantity, item.category);
    };

    return (
        <div className={`flex items-center h-10 font-medium rounded-xl bg-gray-700/80 border border-transparent shadow-inner transition-all ${isInputActive ? 'relative z-20 ring-2 ring-lime-500 border-lime-500/80 shadow-lime-500/20' : ''}`}>
            <button 
                onClick={handleDecrease} 
                onMouseDown={(e) => e.preventDefault()}
                className="px-3 h-full rounded-l-xl text-gray-300 hover:text-white hover:bg-gray-600/70 transition-colors focus:outline-none">
                <MinusIcon className="h-5 w-5"/>
            </button>
            <input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputValue}
                onChange={handleQuantityChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-10 h-full bg-transparent text-center text-lg font-bold text-white focus:outline-none"
            />
            <button 
                onClick={handleIncrease} 
                onMouseDown={(e) => e.preventDefault()}
                className="px-3 h-full rounded-r-xl text-gray-300 hover:text-white hover:bg-gray-600/70 transition-colors focus:outline-none">
                <PlusIcon className="h-5 w-5"/>
            </button>
        </div>
    );
}

export default function CartPage() {
    const { cartItems, removeFromCart, clearCart } = useCart();
    const { t, language } = useLanguage();
    const router = useRouter();
    const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
    const removalTimers = useRef(new Map<string, NodeJS.Timeout>());
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        // Cleanup timers on component unmount
        return () => {
            removalTimers.current.forEach(timer => clearTimeout(timer));
        };
    }, []);

    const startRemoval = (itemId: string, category: string) => {
        const key = `${itemId}-${category}`;
        if (removalTimers.current.has(key)) return;

        setPendingRemoval(prev => [...prev, key]);
        const timer = setTimeout(() => {
            removeFromCart(itemId, category);
            setPendingRemoval(prev => prev.filter(id => id !== key));
            removalTimers.current.delete(key);
        }, 5000);
        removalTimers.current.set(key, timer);
    };

    const cancelRemoval = (itemId: string, category: string) => {
        const key = `${itemId}-${category}`;
        if (removalTimers.current.has(key)) {
            clearTimeout(removalTimers.current.get(key));
            removalTimers.current.delete(key);
            setPendingRemoval(prev => prev.filter(id => id !== key));
        }
    };

    const handleCheckout = () => {
        if (isCheckoutDisabled || pendingRemoval.length > 0) return;
        setIsNavigating(true);
        router.push('/checkout');
    }

    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shippingCost;
    const isCheckoutDisabled = subtotal < MIN_ORDER_AMOUNT;

    return (
        <div className="bg-gray-900 min-h-screen text-white">
            <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-green-500">
                    {t('cart.title')}
                </h1>

                {cartItems.length === 0 && pendingRemoval.length === 0 ? (
                    <div className="text-center bg-gray-800/50 rounded-xl p-12 shadow-2xl shadow-black/20">
                        <p className="text-2xl font-semibold mb-6 text-gray-300">{t('cart.empty')}</p>
                        <Link href="/" className="bg-lime-500 text-gray-900 font-bold py-3 px-8 rounded-full hover:bg-lime-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-400/40">
                            {t('cart.startShopping')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 bg-gray-800/40 rounded-xl shadow-lg backdrop-blur-sm">
                            <ul className="divide-y divide-gray-700/50">
                                {cartItems.map(item => {
                                    const key = `${item.id}-${item.category}`;
                                    const title = (language === 'en' && item.title_en) ? item.title_en : item.title;
                                    return (
                                    <li key={key} className="flex flex-col sm:flex-row justify-between items-center p-5 gap-4">
                                        <Link href={`/products/${item.categoryKey}/${item.id}`} className={`flex items-center gap-5 w-full sm:w-auto group self-start ${pendingRemoval.includes(key) ? 'pointer-events-none opacity-50' : ''}`}>
                                            <img src={item.image_url} alt={title} className="w-20 h-20 object-cover rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"/>
                                            <div>
                                                <h2 className="font-bold text-lg text-gray-200 group-hover:text-lime-400 transition-colors duration-300">{title}</h2>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-lime-500 font-semibold">₾{item.price.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </Link>
                                        
                                        <div className="flex items-center justify-end gap-3 sm:gap-4 self-end sm:self-center w-full sm:w-auto">
                                            {pendingRemoval.includes(key) ? (
                                                <div className="relative h-10 font-medium rounded-xl bg-gray-800/80 border border-transparent shadow-inner flex items-center justify-center overflow-hidden w-[116px]">
                                                    <div className="undo-progress-bar absolute top-0 left-0 h-full"></div>
                                                    <button onClick={() => cancelRemoval(item.id, item.category)} className="text-white font-bold z-10">
                                                        {t('cart.restore')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <CartItemQuantityInput item={item} startRemoval={startRemoval} />
                                                    <button id={`remove-btn-${item.id}`} onClick={() => startRemoval(item.id, item.category)} className="text-gray-400 hover:text-red-500 p-2 rounded-full transition-colors duration-300 hover:bg-red-500/10">
                                                        <TrashIcon className="h-6 w-6" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                )}) }
                            </ul>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1 bg-gray-800/60 rounded-xl shadow-xl p-6 backdrop-blur-sm top-20 sticky">
                           <h2 className="text-2xl font-bold border-b border-gray-700 pb-4 mb-4">{t('cart.orderSummary')}</h2>
                            <div className="flex justify-between mb-2 text-gray-300">
                                <span>{t('cart.subtotal')}</span>
                                <span>₾{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-4 text-gray-300">
                                <span>{t('cart.shipping')}</span>
                                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                                    <span className="font-semibold text-lime-500">{t('cart.free')}</span>
                                ) : (
                                    <span>₾{shippingCost.toFixed(2)}</span>
                                )}
                            </div>
                            <div className="flex justify-between font-extrabold text-2xl border-t border-gray-700 pt-4">
                                <span>{t('cart.total')}</span>
                                <span>₾{total.toFixed(2)}</span>
                            </div>

                            {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                                <p className="text-sm text-center text-gray-400 mt-4 bg-gray-700/50 p-2 rounded-lg">{t('cart.addMoreForFreeShipping', { amount: (FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2) })}</p>
                            )}

                            <div className="mt-8 flex flex-col gap-4">
                                {isCheckoutDisabled ? (
                                    <>
                                        <Link href="/"
                                            className="w-full text-center font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg bg-lime-500 text-gray-900 hover:bg-lime-400 shadow-lime-500/30 hover:shadow-xl"
                                        >
                                            {t('cart.backToProducts')}
                                        </Link>
                                        {subtotal > 0 && (
                                            <p className="text-sm text-center text-red-400 font-semibold">{t('cart.minOrderAmount', { amount: MIN_ORDER_AMOUNT })}</p>
                                        )}
                                    </>
                                ) : (
                                    <button 
                                        onClick={handleCheckout}
                                        className={`w-full text-center font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center ${pendingRemoval.length > 0 || isNavigating ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-lime-500 text-gray-900 hover:bg-lime-400 shadow-lime-500/30 hover:shadow-xl'}`}
                                        disabled={pendingRemoval.length > 0 || isNavigating}
                                    >
                                        {isNavigating ? <Spinner /> : t('cart.proceedToCheckout')}
                                    </button>
                                )}

                                <button onClick={clearCart} className="w-full text-center bg-gray-700 text-gray-300 font-semibold py-2 px-6 rounded-lg hover:bg-red-600 hover:text-white transition-colors duration-300">
                                    {t('cart.clearCart')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}