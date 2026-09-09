'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';

const CategoryIcon = () => (
  <svg className="w-5 h-5 mr-3 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

type SubCategoryInfo = { name: string; name_en: string | null; name_ka?: string | null; key: string; count: number; };
type CategoryInfo    = { name: string; name_en: string | null; name_ka?: string | null; key: string; total: number; sub_categories: SubCategoryInfo[]; };

export default function SidebarMenu() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen]             = useState(false);
  const [categories, setCategories]     = useState<CategoryInfo[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || categories.length > 0) return;
    setLoading(true);
    fetch('/api/products/categories')
      .then(r => r.json())
      .then(data => setCategories(data.categories || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, categories.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.body.style.overflow = 'auto';
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Универсальный выбор имени по языку
  const getName = (item: { name: string; name_en: string | null; name_ka?: string | null }) => {
    if (language === 'en') return item.name_en || item.name;
    if (language === 'ka') return item.name_ka || item.name;
    return item.name;
  };

  const totalProducts = categories.reduce((sum, c) => sum + c.total, 0);

  return (
    <div>
      {/* Анимированный бургер */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 flex flex-col justify-between items-center p-2 group z-50"
      >
        {['top', 'mid', 'bottom'].map((pos, i) => (
          <span key={pos} className={`block w-7 h-[3px] bg-brand-500 rounded-sm transition-all duration-300 ease-in-out
            group-hover:shadow-[0_0_10px_#a3e635]
            ${isOpen ? i === 0 ? 'rotate-45 translate-y-[8px]' : i === 1 ? 'opacity-0' : '-rotate-45 -translate-y-[8px]' : ''}`}/>
        ))}
      </button>

      {/* Боковое меню */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-cream-100 bg-opacity-95 backdrop-blur-sm w-72 shadow-2xl p-6 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-end items-center mb-4 border-b border-ink-200 pb-2 mt-2">
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-full text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>

        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-800 mb-8">
          {t('common.categories')}
        </h2>

        {loading ? (
          <p className="text-ink-500 text-sm">{t('home.loading')}</p>
        ) : (
          <nav><ul>
            {/* Все товары */}
            <li className="mb-2">
              <div className="flex items-center justify-between px-4 py-3 rounded-lg text-lg text-ink-700 hover:bg-brand-600/10 hover:text-brand-600 border border-transparent hover:border-brand-600/30 transition-all duration-200">
                <Link href={`/${language}`} onClick={() => setIsOpen(false)} className="flex items-center flex-grow">
                  <CategoryIcon />
                  <span>{t('common.all')}</span>
                </Link>
                <span className="text-sm font-mono bg-brand-600/20 text-brand-600 rounded-full px-2 py-0.5">{totalProducts}</span>
              </div>
            </li>
            
            {/* Фермеры */}
            <li className="mb-2">
              <div className="flex items-center justify-between px-4 py-3 rounded-lg text-lg text-ink-700 hover:bg-brand-600/10 hover:text-brand-600 border border-transparent hover:border-brand-600/30 transition-all duration-200">
                <Link href={`/${language}/farmers`} onClick={() => setIsOpen(false)} className="flex items-center flex-grow">
                  <CategoryIcon />
                  <span>{t('sidebar.farmers')}</span>
                </Link>
              </div>
            </li>

            {/* Категории */}
            {categories.map(category => (
              <li key={category.key} className="mb-2">
                <div className="flex flex-col">
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-lg text-ink-700 hover:bg-brand-600/10 hover:text-brand-600 border border-transparent hover:border-brand-600/30 transition-all duration-200 cursor-pointer"
                    onClick={() => category.sub_categories?.length > 0
                      ? setOpenCategory(openCategory === category.key ? null : category.key)
                      : setIsOpen(false)
                    }
                  >
                    <Link
                      href={`/${language}/?category=${category.key}`}
                      onClick={e => { if (category.sub_categories?.length > 0) e.preventDefault(); else setIsOpen(false); }}
                      className="flex items-center flex-grow"
                    >
                      <CategoryIcon />
                      <span>{getName(category)}</span>
                    </Link>
                    <div className="flex items-center">
                      <span className="text-sm font-mono bg-brand-600/20 text-brand-600 rounded-full px-2 py-0.5">{category.total}</span>
                      {category.sub_categories?.length > 0 && (
                        <ChevronDownIcon className={`w-5 h-5 ml-2 transition-transform duration-300 ${openCategory === category.key ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </div>

                  {openCategory === category.key && category.sub_categories?.length > 0 && (
                    <ul className="pl-8 mt-2 space-y-2">
                      {category.sub_categories.map(sub => (
                        <li key={sub.key}>
                          <Link
                            href={`/${language}/?category=${category.key}&subcategory=${sub.key}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between py-2 px-3 rounded-md text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors duration-200"
                          >
                            <span>{getName(sub)}</span>
                            <span className="text-xs font-mono bg-ink-200 text-ink-700 rounded-full px-1.5 py-0.5">{sub.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul></nav>
        )}
      </div>

      {isOpen && <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-30" onClick={() => setIsOpen(false)} />}
    </div>
  );
}