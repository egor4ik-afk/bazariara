'use client';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useState, useRef } from 'react';
import { ProductInCart } from '@/lib/types';
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/solid';


const MIN_ORDER_AMOUNT = 35;
const FREE_SHIPPING_THRESHOLD = 150;
const SHIPPING_COST = 20

// Simple Spinner component
const Spinner = () => (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
);

function CartItemQuantityInput({ item, startRemoval }: { item: ProductInCart, startRemoval: (itemId: string, category: string) => void }) {
    const { updateQuantity } = useCart();
    const [quantity, setQuantity] = useState(item.quantity);
    const [isInputActive, setIsInputActive] = useState(false);

    const handleIncrease = () => {
        const newQuantity = quantity + 1;
        setQuantity(newQuantity);
        updateQuantity(item.id, newQuantity, item.category);
    };

    const handleDecrease = () => {
        const newQuantity = quantity - 1;
        if (newQuantity > 0) {
            setQuantity(newQuantity);
            updateQuantity(item.id, newQuantity, item.category);
        } else {
            startRemoval(item.id, item.category);
        }
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuantity(Number(e.target.value));
    };

    const handleFocus = () => {
        setIsInputActive(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsInputActive(false);
        const newQuantity = parseInt(e.target.value, 10);
        if (!isNaN(newQuantity) && newQuantity > 0) {
            updateQuantity(item.id, newQuantity, item.category);
        } else if (!isNaN(newQuantity) && newQuantity <= 0) {
            startRemoval(item.id, item.category);
        } else {
            setQuantity(item.quantity); 
        }
    };

    return (
        <div className={`flex items-center h-10 font-medium rounded-xl bg-ink-100/80 border border-transparent shadow-inner transition-all ${isInputActive ? 'relative z-20 ring-2 ring-brand-500 border-brand-600/80 shadow-brand-600/20' : ''}`}>
             <button 
                 onClick={handleDecrease} 
                 onMouseDown={(e) => e.preventDefault()}
                className="px-3 h-full rounded-l-xl text-ink-700 hover:text-ink-900 hover:bg-ink-200/70 transition-colors focus:outline-none">
                 <MinusIcon className="h-5 w-5"/>
             </button>
             <input 
                type="number" 
                value={quantity} 
                min="1" 
                onChange={handleQuantityChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-10 h-full bg-transparent text-center text-lg font-bold text-ink-900 focus:outline-none"
            />
            <button 
                 onClick={handleIncrease} 
                 onMouseDown={(e) => e.preventDefault()}
                className="px-3 h-full rounded-r-xl text-ink-700 hover:text-ink-900 hover:bg-ink-200/70 transition-colors focus:outline-none">
                 <PlusIcon className="h-5 w-5"/>
             </button>
         </div>
    );
}

export default function CartPage() {
    const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
    const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
    const removalTimers = useRef<{[key: string]: NodeJS.Timeout}>({});
    const [isNavigating, setIsNavigating] = useState(false);
    const router = useRouter();
    const { t, language } = useLanguage();

    const startRemoval = (itemId: string, category: string) => {
        const key = `${itemId}-${category}`;
        setPendingRemoval(prev => [...prev, key]);
        removalTimers.current[key] = setTimeout(() => {
            removeFromCart(itemId, category);
            setPendingRemoval(prev => prev.filter(itemKey => itemKey !== key));
        }, 5000);
    };

    const cancelRemoval = (itemId: string, category: string) => {
        const key = `${itemId}-${category}`;
        clearTimeout(removalTimers.current[key]);
        delete removalTimers.current[key];
        setPendingRemoval(prev => prev.filter(itemKey => itemKey !== key));
    };

    const handleCheckout = () => {
        setIsNavigating(true);
        router.push('/checkout');
    };

    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal > 0 ? SHIPPING_COST : 0;
    const total = subtotal + shippingCost;
    const isCheckoutDisabled = subtotal < MIN_ORDER_AMOUNT;

    return (
        <div className="bg-cream-100 min-h-screen text-ink-900">
            <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-800">
                    {t('cart.title')}
                </h1>

                {cartItems.length === 0 && pendingRemoval.length === 0 ? (
                    <div className="text-center bg-white/50 rounded-xl p-12 shadow-2xl shadow-black/20">
                        <p className="text-2xl font-semibold mb-6 text-ink-700">{t('cart.empty')}</p>
                        <Link href="/" className="bg-brand-600 text-white font-bold py-3 px-8 rounded-full hover:bg-brand-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-600/30 hover:shadow-xl hover:shadow-brand-500/30">
                            {t('cart.startShopping')}
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg backdrop-blur-sm">
                            <ul className="divide-y divide-ink-200/50">
                                {cartItems.map(item => {
                                     const key = `${item.id}-${item.category}`;
                                     const title = (language === 'en' && item.title_en) ? item.title_en : item.title;
                                     return (
                                        <li key={key} className={`flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 transition-opacity duration-500 ${pendingRemoval.includes(key) ? 'opacity-50' : 'opacity-100'}`}>
                                         <Link href={`/products/${item.categoryKey}/${item.id}`} className={`flex items-center gap-5 w-full sm:w-auto group self-start ${pendingRemoval.includes(key) ? 'pointer-events-none opacity-50' : ''}`}>
                                             <img src={item.image_url} alt={title} className="w-20 h-20 object-cover rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"/>
                                             <div>
                                                <h2 className="font-bold text-lg text-ink-800 group-hover:text-brand-700 transition-colors duration-300">{title}</h2>
                                                 <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-brand-700 font-semibold">₾{item.price.toFixed(2)}</p>
                                                 </div>
                                             </div>
                                         </Link>
                                         
                                         <div className="flex items-center justify-end gap-3 sm:gap-4 self-end sm:self-center w-full sm:w-auto">
                                             {pendingRemoval.includes(key) ? (
                                                <div className="relative h-10 font-medium rounded-xl bg-white/80 border border-transparent shadow-inner flex items-center justify-center overflow-hidden w-[116px]">
                                                     <div className="undo-progress-bar absolute top-0 left-0 h-full"></div>
                                                    <button onClick={() => cancelRemoval(item.id, item.category)} className="text-ink-900 font-bold z-10">
                                                         {t('cart.restore')}
                                                     </button>
                                                 </div>
                                             ) : (
                                                 <>
                                                     <CartItemQuantityInput item={item} startRemoval={startRemoval} />
                                                    <button id={`remove-btn-${item.id}`} onClick={() => startRemoval(item.id, item.category)} className="text-ink-600 hover:text-red-500 p-2 rounded-full transition-colors duration-300 hover:bg-red-500/10">
                                                         <TrashIcon className="h-6 w-6" />
                                                     </button>
                                                 </>
                                             )}
                                         </div>
                                     </li>
                                     )
                                 })}
                            </ul>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1 bg-white/60 rounded-xl shadow-xl p-6 backdrop-blur-sm top-20 sticky">
                           <h2 className="text-2xl font-bold border-b border-ink-200 pb-4 mb-4">{t('cart.orderSummary')}</h2>
                            <div className="flex justify-between mb-2 text-ink-700">
                                <span>{t('cart.subtotal')}</span>
                                <span>₾{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-4 text-ink-700">
                                <span>{t('cart.shipping')}</span>
                                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                                    <span className="font-semibold text-brand-700">{t('cart.free')}</span>
                                ) : (
                                    <span>₾{shippingCost.toFixed(2)}</span>
                                )}
                            </div>
                            <div className="flex justify-between font-extrabold text-2xl border-t border-ink-200 pt-4">
                                <span>{t('cart.total')}</span>
                                <span>₾{total.toFixed(2)}</span>
                            </div>

                             {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                                <p className="text-sm text-center text-ink-600 mt-4 bg-ink-100/50 p-2 rounded-lg">{t('cart.addMoreForFreeShipping', { amount: (FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2) })}</p>
                             )}

                             <div className="mt-8 flex flex-col gap-4">
                                 {isCheckoutDisabled ? (
                                     <>
                                         <Link href="/"
                                            className="w-full text-center font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg bg-brand-600 text-white hover:bg-brand-500 shadow-brand-600/30 hover:shadow-xl"
                                        >
                                             {t('cart.backToProducts')}
                                         </Link>
                                         {subtotal > 0 && (
                                            <p className="text-sm text-center text-clay font-semibold">{t('cart.minOrderAmount', { amount: MIN_ORDER_AMOUNT })}</p>
                                         )}
                                     </>
                                 ) : (
                                     <button 
                                         onClick={handleCheckout}
                                        className={`w-full text-center font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center ${pendingRemoval.length > 0 || isNavigating ? 'bg-ink-200 text-ink-600 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-500 shadow-brand-600/30 hover:shadow-xl'}`}
                                         disabled={pendingRemoval.length > 0 || isNavigating}
                                     >
                                         {isNavigating ? <Spinner /> : t('cart.proceedToCheckout')}
                                     </button>
                                 )}

                                <button onClick={clearCart} className="w-full text-center bg-ink-100 text-ink-700 font-semibold py-2 px-6 rounded-lg hover:bg-red-600 hover:text-ink-900 transition-colors duration-300">
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
