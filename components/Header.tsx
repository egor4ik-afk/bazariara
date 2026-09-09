'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCartIcon, UserCircleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';
import { useCart } from '@/contexts/CartContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import SidebarMenu from '@/components/SidebarMenu';


const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const languages: Language[] = ['ru', 'en', 'ka'];

  return (
    <div className="flex items-center bg-cream-100 rounded-full p-1 shadow-inner">
      {languages.map(lang => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-300 ${
            language === lang 
              ? 'bg-brand-600 text-white shadow-md' 
              : 'text-ink-600 hover:bg-cream-200'
          }`}>
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default function Header() {
  const { cartItems } = useCart();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-brand-700 hover:text-brand-600 transition-colors">
                BAZARI ARA
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/gostintsy-iz-gruzii" className="text-base font-medium text-ink-700 hover:text-brand-700 transition-colors">{t('nav.gifts')}</Link>
            <Link href="/powerbank-i-zaryadki" className="text-base font-medium text-ink-700 hover:text-brand-700 transition-colors">{t('nav.powerbanks')}</Link>
            <Link href="/farmers" className="text-base font-medium text-ink-700 hover:text-brand-700 transition-colors">{t('nav.farmers')}</Link>
          </nav>

          {/* Right side icons and burger menu */}
          <div className="flex items-center justify-end space-x-4">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            <Link href="/cart" className="relative p-2 rounded-full hover:bg-cream-100 transition-colors">
              <ShoppingCartIcon className="h-7 w-7 text-ink-700" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                  {totalItems}
                </span>
              )}
            </Link>

            <Link href="/orders" className="p-2 rounded-full hover:bg-cream-100 transition-colors">
              <UserCircleIcon className="h-7 w-7 text-ink-700" />
            </Link>
            
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-md">
                <Bars3Icon className="h-7 w-7 text-ink-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar Menu (Mobile) */}
      <SidebarMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </header>
  );
}
