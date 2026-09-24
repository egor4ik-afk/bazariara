'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrderContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { ShoppingCartIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
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
          <Link href={`/${language}`} className="text-base sm:text-xl font-bold text-ink-900 hover:text-brand-700 transition-colors duration-300 whitespace-nowrap">
            BAZARI ARA
          </Link>
        </div>

        {/* Разделы: только на широком экране. На мобильных они в бургере —
            дублировать их в шапке значит выдавить корзину за край. */}
        <nav className="hidden lg:flex items-center gap-1 mx-2">
          {[
            { href: `/${language}/farmers`, label: t('footer.farmers') },
            { href: `/${language}/regions`, label: t('footer.regions') },
            { href: `/${language}/blog`,    label: t('footer.blog') },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-ink-700
                         hover:text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Правая часть */}
        {isClient && (
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Мои заказы — слева от языка и в виде списка, а не коробки:
                коробка рядом с тележкой читалась как вторая корзина */}
            <Link
              href={`/${language}/orders`}
              aria-label={t('nav.orders')}
              title={t('nav.orders')}
              className="relative flex items-center p-1 text-ink-600 hover:text-brand-700 transition-colors duration-300"
            >
              <ClipboardDocumentListIcon className="h-6 w-6 sm:h-7 sm:w-7" />
              {orderCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-ink-700 text-cream-100 rounded-full h-4 min-w-4 px-1
                                 flex items-center justify-center text-[10px] font-bold leading-none">
                  {orderCount}
                </span>
              )}
            </Link>

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