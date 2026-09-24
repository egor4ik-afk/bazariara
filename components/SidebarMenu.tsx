'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';
import ThemeToggle from '@/components/ThemeToggle'; // Импортируем переключатель темы

type SubCategoryInfo = { name: string; name_en: string | null; name_ka?: string | null; key: string; count: number; };
type CategoryInfo    = { name: string; name_en: string | null; name_ka?: string | null; key: string; total: number; image_url?: string | null; sub_categories: SubCategoryInfo[]; };

export default function SidebarMenu() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen]             = useState(false);
  // Текущая категория — для подсветки строки. Читаем из адреса в момент
  // открытия, а не через useSearchParams: хук в шапке, которая есть на
  // каждой странице, требует Suspense и роняет сборку статических страниц.
  const [activeCat, setActiveCat] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen) setActiveCat(new URLSearchParams(window.location.search).get('category'));
  }, [isOpen]);
  const [brokenImg, setBrokenImg] = useState<Record<string, boolean>>({});
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
      {/* Бургер. Раньше при открытии превращался в крестик и имел z-50
          при z-40 у меню — то есть висел ПОВЕРХ меню прямо на заголовке
          «Категории». Закрытие и так есть в шапке меню, второй крестик
          не нужен: бургер остаётся бургером и уходит под меню. */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('common.categories')}
        aria-expanded={isOpen}
        className="relative w-10 h-10 flex flex-col justify-center gap-[5px] items-center rounded-lg
                   hover:bg-ink-100 transition-colors"
      >
        <span className="block w-6 h-[2.5px] bg-ink-800 rounded-full" />
        <span className="block w-6 h-[2.5px] bg-ink-800 rounded-full" />
        <span className="block w-6 h-[2.5px] bg-ink-800 rounded-full" />
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
              <ul className="space-y-1">
                <li>
                  {/* Та же структура, что у категорий: ссылка + колонка под
                      стрелку. Иначе числа не встают в одну вертикаль. */}
                  <div className={`flex items-center rounded-xl transition-colors
                    ${!activeCat ? 'bg-brand-600/10' : 'hover:bg-ink-100'}`}>
                    <Link
                      href={`/${language}`}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 min-w-0 flex items-center gap-3 px-2 py-2"
                    >
                      <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-600 text-on-brand shrink-0">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                          <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
                        </svg>
                      </span>
                      <span className={`flex-1 min-w-0 truncate text-[15px] font-semibold
                        ${!activeCat ? 'text-brand-700' : 'text-ink-900'}`}>{t('common.all')}</span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-500">{totalProducts}</span>
                    </Link>
                    <span className="shrink-0 w-9 mr-1" aria-hidden="true" />
                  </div>
                </li>

                {categories.map(category => {
                  // Стрелка — только если подкатегорий больше одной или единственная
                  // не покрывает всю категорию. Иначе раскрытие ничего не добавляет.
                  const subs = category.sub_categories || [];
                  const hasSubs = subs.length > 1 || (subs.length === 1 && subs[0].count < category.total);
                  const open = openCategory === category.key;
                  const active = activeCat === category.key;
                  const img = category.image_url && !brokenImg[category.key] ? category.image_url : null;

                  return (
                    <li key={category.key}>
                      <div className={`flex items-center rounded-xl transition-colors
                        ${active ? 'bg-brand-600/10' : 'hover:bg-ink-100'}`}>
                        <Link
                          href={`/${language}/?category=${category.key}`}
                          onClick={() => setIsOpen(false)}
                          className="flex-1 min-w-0 flex items-center gap-3 px-2 py-2"
                        >
                          {/* Миниатюра: по картинке категорию узнают быстрее,
                              чем по названию, особенно на чужом языке */}
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              onError={() => setBrokenImg(p => ({ ...p, [category.key]: true }))}
                              className="w-9 h-9 rounded-lg object-cover bg-cream-200 shrink-0"
                            />
                          ) : (
                            <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-100 text-brand-700
                                             text-sm font-bold shrink-0" aria-hidden="true">
                              {getName(category).charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className={`flex-1 min-w-0 truncate text-[15px]
                            ${active ? 'font-semibold text-brand-700' : 'text-ink-800'}`}>
                            {getName(category)}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-ink-500">{category.total}</span>
                        </Link>
                        {hasSubs ? (
                          <button
                            onClick={() => setOpenCategory(open ? null : category.key)}
                            aria-label="Подкатегории"
                            aria-expanded={open}
                            className="shrink-0 grid place-items-center w-9 h-9 mr-1 rounded-lg
                                       text-ink-500 hover:text-ink-900 hover:bg-ink-200/60 transition-colors"
                          >
                            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                          </button>
                        ) : (
                          // Пустое место той же ширины: числа в колонке не пляшут
                          <span className="shrink-0 w-9 mr-1" aria-hidden="true" />
                        )}
                      </div>

                      {open && hasSubs && (
                        <ul className="ml-[26px] pl-4 border-l-2 border-brand-200 mt-1 mb-2 space-y-0.5">
                          {subs.map(sub => (
                            <li key={sub.key}>
                              <Link
                                href={`/${language}/?category=${category.key}&subcategory=${sub.key}`}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg
                                           text-sm text-ink-700 hover:bg-ink-100 hover:text-ink-900 transition-colors"
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