'use client';

import { useState, useEffect } from 'react';
import { useCart, Product } from '@/contexts/CartContext';
import { MinusIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

interface QuantityInputProps {
    product: Product;
}

export default function QuantityInput({ product }: QuantityInputProps) {
    const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
    const { t } = useLanguage(); // Get t function
    const cartItem = cartItems.find(item => item.id === product.id && item.category === product.category);

    const [inputValue, setInputValue] = useState<string | number>('');
    const [isInputActive, setIsInputActive] = useState(false);

    useEffect(() => {
        if (cartItem) {
            setInputValue(cartItem.quantity);
        } else {
            setInputValue('');
        }
    }, [cartItem]);

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

    const handleFocus = () => {
        setIsInputActive(true);
    };

    const handleBlur = () => {
        setIsInputActive(false);
        if (cartItem) {
            const newQuantity = parseInt(inputValue.toString(), 10);
            if (!isNaN(newQuantity) && newQuantity > 0) {
                updateQuantity(cartItem.id, newQuantity, cartItem.category);
            } else if (newQuantity <= 0) {
                removeFromCart(cartItem.id, cartItem.category);
            } else {
                setInputValue(cartItem.quantity);
            }
        }
    };

    if (!cartItem) {
        return (
            <button
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-center px-4 py-3 font-bold rounded-lg bg-brand-600 text-on-brand hover:bg-brand-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-600/30 hover:shadow-xl hover:shadow-brand-500/30"
            >
                <ShoppingCartIcon className="h-5 w-5 mr-2 hidden sm:inline-block" />
                <span>{t('quantityInput.addToCart')}</span>
            </button>
        );
    }

    return (
        <>
            {isInputActive && (
                <div className="fixed inset-0 z-40" />
            )}
            <div className={`quantity-input-container flex items-center justify-center gap-2 ${isInputActive ? 'relative z-50' : ''}`}>
                <button
                    onClick={handleDecreaseQuantity}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-3 rounded-full bg-ink-100 text-ink-900 hover:bg-ink-200 transition-colors"
                >
                    <MinusIcon className="h-5 w-5" />
                </button>
                <input
                    type="number"
                    value={inputValue}
                    onChange={handleQuantityChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="text-xl font-bold w-12 text-center bg-transparent text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md"
                    min="1"
                />
                <button
                    onClick={handleIncreaseQuantity}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-3 rounded-full bg-ink-100 text-ink-900 hover:bg-ink-200 transition-colors"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>
        </>
    );
}
