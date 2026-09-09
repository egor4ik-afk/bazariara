'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

type Category = {
  key: string;
  name: string;
  name_en?: string | null;
  name_ka?: string | null;
  imageUrl?: string;
};

/**
 * Карусель категорий.
 *
 * Мобильная и десктопная версии — это два разных представления одного списка,
 * а не одно, ужатое до 24% ширины. На телефоне карточка с картинкой 56px и
 * подписью в две строки нечитаема, поэтому там компактные чипы: круглая
 * миниатюра + подпись рядом, лента скроллится горизонтально одной рукой.
 * На десктопе остаются полноразмерные карточки.
 */
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
  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  // Подтягиваем активную категорию в центр ленты. scrollIntoView на элементе
  // прокручивал ещё и всю страницу — используем ручной расчёт по контейнеру.
  useEffect(() => {
    if (!selectedCategory) return;
    for (const ref of [mobileRef, desktopRef]) {
      const el = ref.current;
      if (!el) continue;
      const item = el.querySelector<HTMLElement>(`[data-cat="${selectedCategory}"]`);
      if (!item) continue;
      const left = item.offsetLeft - el.clientWidth / 2 + item.clientWidth / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }, [selectedCategory, categories]);

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

  return (
    <div className="w-full">
      {/* ── Мобильная лента: компактные чипы ───────────────────────────── */}
      <div ref={mobileRef} className="scroll-x sm:hidden -mx-4 px-4 pb-2">
        <div className="flex gap-2 w-max">
          {categories.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <Wrapper
                key={cat.key}
                cat={cat}
                className={
                  'flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border ' +
                  'transition-colors duration-200 shrink-0 ' +
                  (active
                    ? 'bg-brand-600 border-brand-600 text-on-brand'
                    : 'bg-surface border-ink-200 text-ink-800 active:bg-cream-200')
                }
              >
                <img
                  src={cat.imageUrl || '/placeholder-category.svg'}
                  alt=""
                  aria-hidden="true"
                  className="w-8 h-8 rounded-full object-cover bg-cream-200 shrink-0"
                  loading="lazy"
                />
                <span className="text-[13px] font-semibold whitespace-nowrap">
                  {getName(cat)}
                </span>
              </Wrapper>
            );
          })}
        </div>
      </div>

      {/* ── Десктоп: карточки ──────────────────────────────────────────── */}
      <div ref={desktopRef} className="scroll-x hidden sm:block pb-3">
        <div className="flex gap-4 w-max px-1 py-1">
          {categories.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <Wrapper
                key={cat.key}
                cat={cat}
                className={
                  'group flex flex-col items-center w-[124px] md:w-[148px] shrink-0 ' +
                  'rounded-2xl bg-surface border transition-all duration-200 overflow-hidden ' +
                  (active
                    ? 'border-brand-500 shadow-cardHover ring-1 ring-brand-500'
                    : 'border-ink-200 shadow-card hover:border-brand-300 hover:shadow-cardHover')
                }
              >
                <div className="w-full aspect-square p-3">
                  <img
                    src={cat.imageUrl || '/placeholder-category.svg'}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover rounded-xl bg-cream-200
                               transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <span
                  className={
                    'w-full text-center px-2 py-2 text-xs md:text-[13px] font-semibold ' +
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
