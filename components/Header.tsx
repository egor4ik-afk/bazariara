'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrderContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShoppingCartIcon, ArchiveBoxIcon } from '@heroicons/react/24/solid';
import { calculateDisplayPrice } from '@/lib/priceLogic';
import SidebarMenu from './SidebarMenu';

export default function Header() {
    const { cartItems } = useCart();
    const { orders } = useOrders();
    const { language, setLanguage } = useLanguage();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + calculateDisplayPrice(item.price) * item.quantity, 0);
    const orderCount = orders.length;

    const toggleLanguage = () => {
        setLanguage(language === 'ru' ? 'en' : 'ru');
    };

    return (
        <header className="bg-gray-800 p-4 shadow-md sticky top-0 z-20">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <SidebarMenu />
                    <Link href="/" className="text-2xl font-bold text-white hover:text-lime-400 transition-colors duration-300">
                        BAZARI ARA
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    {isClient && (
                        <>
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-2 text-white hover:text-lime-400 transition-colors duration-300 px-3 py-2 rounded-lg hover:bg-gray-700"
                                aria-label="Switch language"
                            >
                                <Image 
                                  src={language === 'ru' ? '/ru.svg' : '/gb.svg'} 
                                  alt="Language flag" 
                                  width={24} 
                                  height={24} 
                                  className="w-6 h-6 rounded-full object-cover" 
                                />
                                <span className="font-semibold text-sm uppercase">{language}</span>
                            </button>
                            <Link href="/orders" className="relative flex items-center text-white hover:text-lime-400 transition-colors duration-300">
                                <ArchiveBoxIcon className="h-8 w-8" />
                                {orderCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-lime-500 text-gray-900 rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                                        {orderCount}
                                    </span>
                                )}
                            </Link>
                            <Link href="/cart" className="relative flex items-center text-white hover:text-lime-400 transition-colors duration-300">
                                {
                                    totalPrice > 0 && (
                                        <span className="mr-3 text-lg font-bold text-lime-400">
                                            ₾{totalPrice.toFixed(2)}
                                        </span>
                                    )
                                }
                                <ShoppingCartIcon className="h-8 w-8" />
                                {itemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-lime-500 text-gray-900 rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
