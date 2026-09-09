'use client';

import { useRef, useState, useEffect } from 'react';
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
  buildHref 
}: {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  buildHref?: (key: string) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedCategory) return;
    const item = el.querySelector<HTMLElement>(`#category-${selectedCategory}`);
    if (item) {
        const parent = item.parentElement;
        if(parent) {
            parent.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
    }
  }, [selectedCategory, categories]);

  const getName = (cat: Category) => {
    switch (language) {
      case 'en': return cat.name_en || cat.name;
      case 'ka': return cat.name_ka || cat.name;
      default:   return cat.name;
    }
  };

  const cardClass = (key: string) =>
    `flex flex-col items-center justify-start pt-2 sm:pt-3 w-full h-full rounded-2xl overflow-hidden transition-all duration-300 ` +
    (selectedCategory === key
      ? 'ring-2 ring-lime-500 shadow-lg shadow-lime-500/30'
      : 'ring-1 ring-gray-700 hover:ring-lime-400');

  const labelClass = (key: string) =>
    `w-full text-center py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold tracking-wide ` +
    `whitespace-nowrap overflow-hidden text-ellipsis ` +
    (selectedCategory === key ? 'bg-lime-500 text-gray-900' : 'bg-gray-800 text-gray-100');

  return (
    <div className="w-full">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4
                   [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex pl-2 sm:pl-4">
        {categories.map((category) => (
          <div 
            key={category.key} 
            className="flex-[0_0_24%] min-w-0 sm:flex-[0_0_20%] md:flex-[0_0_15%] pl-2 sm:pl-4"
          >
          {buildHref ? (
            <Link
              id={`category-${category.key}`}
              href={buildHref(category.key)}
              onClick={(e) => { e.preventDefault(); onSelectCategory(category.key); }}
              className={cardClass(category.key)}
              prefetch={false}
            >
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 mx-auto mb-2 sm:mb-3">
                <img
                  src={category.imageUrl || '/placeholder.png'}
                  alt={getName(category)}
                  className="object-cover w-full h-full rounded-lg shadow-md"
                  loading="lazy"
                />
              </div>
              <span className={labelClass(category.key)}>{getName(category)}</span>
            </Link>
          ) : (
            <button
              id={`category-${category.key}`}
              onClick={() => onSelectCategory(category.key)}
              className={cardClass(category.key)}
            >
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-28 md:h-28 mx-auto mb-2 sm:mb-3">
                <img
                  src={category.imageUrl || '/placeholder.png'}
                  alt={getName(category)}
                  className="object-cover w-full h-full rounded-lg shadow-md"
                  loading="lazy"
                />
              </div>
              <span className={labelClass(category.key)}>{getName(category)}</span>
            </button>
          )}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}