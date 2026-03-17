'use client';

import { useRef, useState, useEffect } from 'react';
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
}: {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { language } = useLanguage();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setScrollProgress(maxScroll > 0 ? (el.scrollLeft / maxScroll) * 100 : 0);
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedCategory) return;
    const btn = el.querySelector<HTMLButtonElement>(`#category-${selectedCategory}`);
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  }, [selectedCategory, categories]);

  // Функция перевода с fallback на русский
  const getName = (cat: Category) => {
    switch (language) {
      case 'en': return cat.name_en || cat.name;
      case 'ka': return cat.name_ka || cat.name;
      default:   return cat.name;
    }
  };

  return (
    <div className="w-full px-2 sm:px-4">
      <div
        ref={scrollRef}
        className="flex space-x-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2
                   [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => (
          <button
            key={category.key}
            id={`category-${category.key}`}
            onClick={() => onSelectCategory(category.key)}
            className={`flex flex-col items-center justify-between flex-shrink-0 w-40 sm:w-48 md:w-52 rounded-2xl overflow-hidden snap-start transition-all duration-300
              ${selectedCategory === category.key
                ? 'ring-2 ring-lime-500 shadow-md shadow-lime-500/30 scale-[1.04]'
                : 'ring-1 ring-gray-700 hover:ring-lime-400 hover:scale-[1.03]'}`
            }
          >
            <div className="w-full flex justify-center items-center bg-gray-900">
              <img
                src={category.imageUrl || '/placeholder.png'}
                alt={getName(category)}
                className="object-cover w-full h-auto"
                loading="lazy"
              />
            </div>
            <span className={`w-full text-center py-1.5 text-[11px] sm:text-sm font-semibold tracking-wide truncate
              ${selectedCategory === category.key
                ? 'bg-lime-500 text-gray-900'
                : 'bg-gray-800 text-gray-100'}`
            }>
              {getName(category)}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-lime-500 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${Math.max(scrollProgress, 5)}%` }}
        />
      </div>
    </div>
  );
}