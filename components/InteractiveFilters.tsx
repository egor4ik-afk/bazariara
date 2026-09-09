'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Category, SubCategory } from '@/lib/types';
import { FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

interface SearchParams {
  search?: string;
  category?: string;
  subcategory?: string;
  sort?: string;
  [key: string]: string | string[] | undefined;
}

interface InteractiveFiltersProps {
  categories: Category[];
  searchParams: SearchParams;
  totalProducts: number;
  buildPageUrl: (pageNumber: number) => string;
}

export default function InteractiveFilters({ categories, searchParams, totalProducts, buildPageUrl }: InteractiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState(searchParams.search || '');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    categories.find(c => c.key === searchParams.category) || null
  );
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  // Handle search input change
  useEffect(() => {
    const handler = setTimeout(() => {
      updateUrl({ search: searchQuery });
    }, 500); // Debounce search input
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Function to update URL search parameters
  const updateUrl = (newParams: Partial<SearchParams>) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  // Handle sorting change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl({ sort: e.target.value });
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategoryKey: string) => {
    updateUrl({ subcategory: searchParams.subcategory === subcategoryKey ? undefined : subcategoryKey });
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow p-4 sticky top-24 z-30">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Search Input */}
        <div className="w-full sm:w-auto flex-grow">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full px-4 py-2 rounded-lg bg-cream-100 border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
        </div>

        {/* Filter Toggle Button (mobile) */}
        <div className="sm:hidden flex justify-between w-full">
            <button
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cream-100 hover:bg-cream-200 text-ink-800 transition-colors"
            >
                <FunnelIcon className="h-5 w-5" />
                <span>{t('filters.title')}</span>
                {isFiltersVisible ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
            <span className="px-4 py-2 text-sm font-medium text-ink-600">
              {t('filters.found', { count: totalProducts })}
            </span>
        </div>

        {/* Filters and Sorting */}
        <div className={`w-full sm:w-auto sm:flex items-center gap-4 ${isFiltersVisible ? 'flex' : 'hidden'} flex-col sm:flex-row mt-4 sm:mt-0`}>
          {/* Sorting Dropdown */}
          <select
            value={searchParams.sort || 'default'}
            onChange={handleSortChange}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-cream-100 border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          >
            <option value="default">{t('filters.sort.default')}</option>
            <option value="price_asc">{t('filters.sort.price_asc')}</option>
            <option value="price_desc">{t('filters.sort.price_desc')}</option>
          </select>

          {/* Subcategory Filters */}
          {selectedCategory && selectedCategory.subCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
              {selectedCategory.subCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSubcategoryChange(sub.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    searchParams.subcategory === sub.key
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-cream-100 hover:bg-cream-200 text-ink-800'
                  }`}>
                  {language === 'en' ? sub.name_en : language === 'ru' ? sub.name_ru : sub.name_ka}
                </button>
              ))}
            </div>
          )}
        </div>
         <span className="hidden sm:block px-4 py-2 text-sm font-medium text-ink-600 whitespace-nowrap">
              {t('filters.found', { count: totalProducts })}
        </span>
      </div>
    </div>
  );
}
