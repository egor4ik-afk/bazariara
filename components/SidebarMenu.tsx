'use client';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import Link from 'next/link';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const languages: Language[] = ['ru', 'en', 'ka'];

  return (
    <div className="flex items-center justify-center bg-cream-200/80 rounded-full p-1.5">
      {languages.map(lang => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`w-1/3 py-2 text-sm font-bold rounded-full transition-colors duration-300 ${
            language === lang
              ? 'bg-brand-600 text-white shadow-lg'
              : 'text-ink-700 hover:bg-white/50'
          }`}>
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default function SidebarMenu({ isOpen, onClose }: SidebarMenuProps) {
  const { t } = useLanguage();

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/gostintsy-iz-gruzii', label: t('nav.gifts') },
    { href: '/powerbank-i-zaryadki', label: t('nav.powerbanks') },
    { href: '/farmers', label: t('nav.farmers') },
    { href: '/cart', label: t('nav.cart') },
    { href: '/orders', label: t('nav.orders') },
  ];

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        {/* Sidebar Panel */}
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-500 sm:duration-700"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-500 sm:duration-700"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="relative w-screen max-w-sm">
              <div className="flex h-full flex-col overflow-y-scroll bg-cream-100 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-6 border-b border-cream-200">
                  <Dialog.Title className="text-xl font-bold text-brand-700">BAZARI ARA</Dialog.Title>
                  <button type="button" className="p-2 -mr-2 rounded-md hover:bg-cream-200" onClick={onClose}>
                    <XMarkIcon className="h-7 w-7 text-ink-800" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-grow p-6">
                  <nav className="flex flex-col gap-4">
                    {navLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={onClose}
                        className="text-lg font-semibold text-ink-800 hover:text-brand-600 hover:bg-cream-200 p-3 rounded-lg transition-all duration-200"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>

                {/* Language Switcher */}
                <div className="p-6 border-t border-cream-200">
                    <LanguageSwitcher />
                </div>

                {/* Footer links */}
                <div className="px-6 py-4 text-center text-sm">
                  <Link href="/privacy-policy" onClick={onClose} className="text-ink-600 hover:text-brand-700">{t('nav.privacy')}</Link>
                  <span className='mx-2'>|</span>
                  <Link href="/terms-of-service" onClick={onClose} className="text-ink-600 hover:text-brand-700">{t('nav.terms')}</Link>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
