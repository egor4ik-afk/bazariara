'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useOrders } from '@/contexts/OrderContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { ShoppingCartIcon, ArchiveBoxIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import SidebarMenu from './SidebarMenu';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'ru', label: 'Русский',  flag: 'https://flagcdn.com/w40/ru.png' },
  { code: 'en', label: 'English',  flag: 'https://flagcdn.com/w40/gb.png' },
  { code: 'ka', label: 'ქართული', flag: 'https://flagcdn.com/w40/ge.png' },
];

export default function Header() {
  const { cartItems } = useCart();
  const { orders }    = useOrders();
  const { language, setLanguage, t } = useLanguage();

  const [isClient,     setIsClient]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const itemCount  = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderCount = orders.length;
  const current    = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];

  return (
    <header className="bg-surface px-3 py-3 sm:p-4 shadow-md sticky top-0 z-20">
      <div className="container mx-auto flex justify-between items-center gap-2">

        {/* Левая часть */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <SidebarMenu />
          <Link href={`/${language}`} className="text-lg sm:text-2xl font-bold text-ink-900 hover:text-brand-700 transition-colors duration-300 whitespace-nowrap">
            BAZARI ARA
          </Link>
        </div>

        {/* Правая часть */}
        {isClient && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Переключатель темы */}
            <ThemeToggle />

            {/* Дропдаун языка */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 transition-colors text-ink-900 text-sm font-semibold"
              >
                <Image src={current.flag} alt={current.label} width={20} height={15} className="rounded-sm object-cover shadow-sm" />
                <span className="uppercase text-xs tracking-wide">{current.code}</span>
                <ChevronDownIcon className={`h-3 w-3 text-ink-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-cream-100 border border-ink-200 rounded-xl shadow-2xl overflow-hidden z-50">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                        ${language === lang.code
                          ? 'bg-ink-100/80 text-brand-700 font-semibold'
                          : 'text-ink-700 hover:bg-surface'
                        }`}
                    >
                      <Image
                        src={lang.flag}
                        alt={lang.label}
                        width={24}
                        height={18}
                        className="rounded-sm object-cover shadow-sm flex-shrink-0"
                      />
                      <span>{lang.label}</span>
                      {language === lang.code && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Заказы */}
            <Link href={`/${language}/orders`} className="relative flex items-center text-ink-900 hover:text-brand-700 transition-colors duration-300">
              <ArchiveBoxIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              {orderCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-on-brand rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                  {orderCount}
                </span>
              )}
            </Link>

            {/* Корзина */}
            <Link href={`/${language}/cart`} className="relative flex items-center text-ink-900 hover:text-brand-700 transition-colors duration-300">
              {totalPrice > 0 && (
                <span className="hidden sm:inline mr-3 text-lg font-bold text-brand-700">
                  ₾{totalPrice.toFixed(2)}
                </span>
              )}
              <ShoppingCartIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-on-brand rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}