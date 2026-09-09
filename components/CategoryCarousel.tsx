'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

type Category = {
  key: string;
  name: string;
  name_en?: string | null;
  name_ka?: string | null;
  imageUrl?: string;
};

export default function CategoryCarousel({
  categories,
  selectedCategory,
  onSelectCategory,
  buildHref,
}: {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  buildHref?: (key: string) => string;
}) {
  const desktopRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  // 1. Слушаем изменение настроек карусели
  useEffect(() => {
    const saved = localStorage.getItem('showCarousel');
    if (saved !== null) {
      setIsVisible(saved === 'true');
    }

    const handleVisibilityChange = (e: Event) => {
      setIsVisible((e as CustomEvent).detail);
    };

    window.addEventListener('carouselVisibilityChanged', handleVisibilityChange);
    return () => window.removeEventListener('carouselVisibilityChanged', handleVisibilityChange);
  }, []);

  // 2. Скролл к активной категории (ХУК ДОЛЖЕН БЫТЬ ДО RETURN)
  useEffect(() => {
    if (!selectedCategory || !isVisible) return;
    const el = desktopRef.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>(`[data-cat="${selectedCategory}"]`);
    if (!item) return;
    const left = item.offsetLeft - el.clientWidth / 2 + item.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [selectedCategory, categories, isVisible]);

  const getName = (cat: Category) => {
    switch (language) {
      case 'en': return cat.name_en || cat.name;
      case 'ka': return cat.name_ka || cat.name;
      default:   return cat.name;
    }
  };

  const handle = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    onSelectCategory(key);
  };

  const Wrapper = ({
    cat, children, className,
  }: { cat: Category; children: React.ReactNode; className: string }) =>
    buildHref ? (
      <Link
        data-cat={cat.key}
        href={buildHref(cat.key)}
        onClick={(e) => handle(e, cat.key)}
        className={className}
        prefetch={false}
        aria-current={selectedCategory === cat.key ? 'true' : undefined}
      >
        {children}
      </Link>
    ) : (
      <button
        data-cat={cat.key}
        type="button"
        onClick={() => onSelectCategory(cat.key)}
        className={className}
        aria-current={selectedCategory === cat.key ? 'true' : undefined}
      >
        {children}
      </button>
    );

  // 3. ОТКЛЮЧАЕМ РЕНДЕР ТОЛЬКО ЗДЕСЬ (ПОСЛЕ ВСЕХ ХУКОВ)
  if (!isVisible) return null;

  return (
    <div className="w-full">
      {/* ── Единая карусель карточек для мобилок и десктопа ────────────────── */}
      <div 
        ref={desktopRef} 
        className="flex overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-3 md:gap-4 w-max">
          {categories.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <Wrapper
                key={cat.key}
                cat={cat}
                className={
                  'group flex flex-col items-center w-[110px] md:w-[148px] shrink-0 snap-start ' +
                  'rounded-2xl bg-surface border transition-all duration-200 overflow-hidden ' +
                  (active
                    ? 'border-brand-500 shadow-cardHover ring-1 ring-brand-500'
                    : 'border-ink-200 shadow-card hover:border-brand-300 hover:shadow-cardHover')
                }
              >
                <div className="w-full aspect-square p-2 md:p-3">
                  <img
                    src={cat.imageUrl || '/placeholder-category.svg'}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover rounded-xl bg-cream-200 transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <span
                  className={
                    'w-full text-center px-1 md:px-2 py-2 text-[11px] md:text-[13px] font-semibold ' +
                    'leading-tight min-h-[2.6em] flex items-center justify-center ' +
                    (active ? 'bg-brand-600 text-on-brand' : 'text-ink-800')
                  }
                >
                  {getName(cat)}
                </span>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
}