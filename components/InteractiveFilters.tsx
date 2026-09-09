'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CategoryCarousel from '@/components/CategoryCarousel';
import { useLanguage } from '@/contexts/LanguageContext';

type Category = { name: string; key: string; imageUrl: string };

export default function InteractiveFilters({ 
  categories, 
  subCategories, 
  selectedCategory, 
  selectedSubCategory 
}: { 
  categories: Category[], 
  subCategories: Category[], 
  selectedCategory: string, 
  selectedSubCategory: string 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  
  const [inputValue, setInputValue] = useState(searchParams.get('search') || '');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');
      if (newValue.length >= 2) {
        params.set('search', newValue);
      } else {
        params.delete('search');
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 500); 
  };

  const handleCategoryChange = (categoryKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedCategory === categoryKey) {
        params.delete('category');
        params.delete('subcategory');
    } else {
        params.set('category', categoryKey);
        params.delete('subcategory');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const handleSubCategoryChange = (subCategoryKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedSubCategory === subCategoryKey) {
        params.delete('subcategory');
    } else {
        params.set('subcategory', subCategoryKey);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <div className="mb-2 max-w-md mx-auto">
        <input
          type="text"
          placeholder={t('home.searchPlaceholder')}
          value={inputValue}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 rounded-full bg-surface text-ink-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      
      {/* ВАЖНО: Убран класс "hidden md:block", теперь карусель всегда в DOM */}
      <div className="w-full px-2 sm:px-4 mt-4">
        <CategoryCarousel 
            categories={categories} 
            selectedCategory={selectedCategory} 
            onSelectCategory={handleCategoryChange}
            buildHref={(key) =>
                key === selectedCategory
                ? '/'               // снятие фильтра — идём на главную
                : `/?category=${key}`
            }
        />
        {subCategories.length > 0 && (
          <div className="mt-4">
            <CategoryCarousel 
                categories={subCategories} 
                selectedCategory={selectedSubCategory} 
                onSelectCategory={handleSubCategoryChange}
                buildHref={(key) =>
                    key === selectedSubCategory
                    ? `/?category=${selectedCategory}`
                    : `/?category=${selectedCategory}&subcategory=${key}`
                }
            />
          </div>
        )}
      </div>
    </>
  );
}