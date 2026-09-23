'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';
import ThemeToggle from '@/components/ThemeToggle'; // Импортируем переключатель темы

type SubCategoryInfo = { name: string; name_en: string | null; name_ka?: string | null; key: string; count: number; };
type CategoryInfo    = { name: string; name_en: string | null; name_ka?: string | null; key: string; total: number; sub_categories: SubCategoryInfo[]; };

export default function SidebarMenu() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen]             = useState(false);
  const [categories, setCategories]     = useState<CategoryInfo[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  
  // Состояние для карусели (по умолчанию true)
  const [showCarousel, setShowCarousel] = useState(true);
  
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

  // Загружаем состояние карусели из localStorage при старте
  useEffect(() => {
    const saved = localStorage.getItem('showCarousel');
    if (saved !== null) {
      setShowCarousel(saved === 'true');
    }
  }, []);

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

  // Обработчик переключения карусели
  const toggleCarousel = () => {
    const newValue = !showCarousel;
    setShowCarousel(newValue);
    localStorage.setItem('showCarousel', String(newValue));
    // Отправляем событие, чтобы карусель сразу на него отреагировала
    window.dispatchEvent(new CustomEvent('carouselVisibilityChanged', { detail: newValue }));
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
          <span key={pos} className={`block w-7 h-[3px] bg-ink-800 rounded-sm transition-all duration-300 ease-in-out
            
            ${isOpen ? i === 0 ? 'rotate-45 translate-y-[8px]' : i === 1 ? 'opacity-0' : '-rotate-45 -translate-y-[8px]' : ''}`}/>
        ))}
      </button>

      {/*
        Боковое меню.

        Раньше списку категорий оставалось ~20px на телефоне: над ним стояли
        строка с крестиком и отдельный заголовок, под ним — блок ссылок и
        два ряда настроек, всё фиксированной высоты. А сам список в flex-колонке
        был без min-h-0, поэтому не умел сжиматься и выталкивал всё остальное.

        Теперь: шапка — одна строка (заголовок + крестик), список — всё
        свободное место, разделы и настройки — одна компактная полоса внизу.
      */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-[100dvh] w-[86vw] max-w-[340px] bg-cream-100
          shadow-2xl z-40 transform transition-transform duration-300 ease-in-out
          flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Шапка: заголовок и закрытие в одну строку */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-ink-200 shrink-0">
          <h2 className="text-base font-bold text-ink-900">{t('common.categories')}</h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Закрыть меню"
            className="p-1.5 -mr-1.5 rounded-lg text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Категории — занимают всё свободное место. min-h-0 обязателен:
            без него элемент с overflow в flex-колонке не сжимается. */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2">
          {loading ? (
            <p className="text-ink-500 text-sm px-3 py-2">{t('home.loading')}</p>
          ) : (
            <nav>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={`/${language}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg
                               text-[15px] font-semibold text-ink-900 hover:bg-brand-600/10
                               hover:text-brand-700 transition-colors"
                  >
                    <span className="truncate">{t('common.all')}</span>
                    <span className="shrink-0 text-xs tabular-nums text-ink-500">{totalProducts}</span>
                  </Link>
                </li>

                {categories.map(category => {
                  const hasSubs = category.sub_categories?.length > 0;
                  const open = openCategory === category.key;
                  return (
                    <li key={category.key}>
                      <div className="flex items-center rounded-lg hover:bg-brand-600/10 transition-colors">
                        <Link
                          href={`/${language}/?category=${category.key}`}
                          onClick={() => setIsOpen(false)}
                          className="flex-1 min-w-0 flex items-center justify-between gap-2
                                     pl-3 pr-2 py-2.5 text-[15px] text-ink-800 hover:text-brand-700"
                        >
                          <span className="truncate">{getName(category)}</span>
                          <span className="shrink-0 text-xs tabular-nums text-ink-500">{category.total}</span>
                        </Link>
                        {/* Стрелка — отдельная кнопка: раньше клик по названию
                            категории с подкатегориями только раскрывал список,
                            и в саму категорию нельзя было попасть */}
                        {hasSubs && (
                          <button
                            onClick={() => setOpenCategory(open ? null : category.key)}
                            aria-label="Подкатегории"
                            aria-expanded={open}
                            className="shrink-0 p-2 mr-1 rounded-md text-ink-500 hover:text-ink-900"
                          >
                            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {open && hasSubs && (
                        <ul className="ml-3 pl-3 border-l border-ink-200 my-0.5">
                          {category.sub_categories.map(sub => (
                            <li key={sub.key}>
                              <Link
                                href={`/${language}/?category=${category.key}&subcategory=${sub.key}`}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between gap-2 px-2 py-2 rounded-md
                                           text-sm text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors"
                              >
                                <span className="truncate">{getName(sub)}</span>
                                <span className="shrink-0 text-xs tabular-nums text-ink-400">{sub.count}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>

        {/* Разделы сайта — компактная полоса чипов. Фермеры, регионы и
            путеводитель на широком экране уже есть в шапке сайта, поэтому
            здесь они скрыты от lg: и выше, чтобы не дублироваться. */}
        <div className="shrink-0 border-t border-ink-200 py-2.5">
          {/* Одна строка с прокруткой: при переносе чипы на узком экране
              ложились в три ряда и отнимали место у категорий. */}
          <div className="scroll-x flex gap-1.5 px-3">
            {[
              { href: `/${language}/farmers`,             label: t('footer.farmers'),      desk: false },
              { href: `/${language}/regions`,             label: t('footer.regions'),      desk: false },
              { href: `/${language}/blog`,                label: t('footer.blog'),         desk: false },
              { href: `/${language}/gostintsy-iz-gruzii`, label: t('footer.gifts'),        desk: true },
              { href: `/${language}/farmers/join`,        label: t('footer.becomeFarmer'), desk: true },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full bg-surface border border-ink-200
                            text-xs font-medium text-ink-700 hover:border-brand-400
                            hover:text-brand-700 transition-colors ${item.desk ? '' : 'lg:hidden'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Настройки — одна строка вместо двух */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t border-ink-200">
          <button
            onClick={toggleCarousel}
            className="flex items-center gap-2.5 text-sm text-ink-700"
            role="switch"
            aria-checked={showCarousel}
          >
            <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300
                ${showCarousel ? 'bg-brand-600' : 'bg-ink-300'}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-300
                  ${showCarousel ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
            </span>
            {t('menu.carousel')}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-30" onClick={() => setIsOpen(false)} />}
    </div>
  );
}