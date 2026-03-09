'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { calculateDisplayPrice } from '@/lib/priceLogic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import CategoryCarousel from '@/components/CategoryCarousel';
import QuantityInput from '@/components/QuantityInput';
import { useLanguage } from '@/contexts/LanguageContext';

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

type Product = {
  id: string;
  title: string;
  title_en?: string;
  category: string;
  category_en?: string;
  price: number;
  in_stock: boolean;
  description?: string;
  description_en?: string;
  image_url?: string;
  categoryKey: string;
  sub_category?: string;
  sub_category_en?: string;
  subCategoryKey?: string;
  image_urls?: string[];
};

type Category = {
    name: string;
    name_en?: string;
    key: string;
    imageUrl: string;
};

const ITEMS_PER_PAGE = 20;

export default function HomePageContent({ products: initialProducts }: { products: Product[] }) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { t, language } = useLanguage();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedCategory = searchParams.get('category') || 'all';
  const selectedSubCategory = searchParams.get('subcategory') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';

  const [inputValue, setInputValue] = useState(searchQuery);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const productsWithImages = initialProducts.filter(p => p.image_url && p.image_url.trim() !== '');
    const sortedProducts = [...productsWithImages].sort((a, b) => {
        if (a.in_stock && !b.in_stock) return -1;
        if (!a.in_stock && b.in_stock) return 1;
        return 0;
    });
    setAllProducts(sortedProducts);

    const categoryMap = new Map<string, { name: string; name_en?: string; imageUrl: string }>();
    sortedProducts.forEach(product => {
        if (!categoryMap.has(product.categoryKey)) {
            categoryMap.set(product.categoryKey, {
                name: product.category,
                name_en: product.category_en,
                imageUrl: product.image_url!,
            });
        }
    });

    const uniqueCategories = Array.from(categoryMap.entries()).map(([key, { name, name_en, imageUrl }]) => ({ key, name, name_en, imageUrl }));
    setCategories(uniqueCategories);

  }, [initialProducts]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const subCategories = useMemo(() => {
    if (selectedCategory === 'all') {
      return [];
    }
    const categoryProducts = allProducts.filter(p => p.categoryKey === selectedCategory);
    const subCategoryMap = new Map<string, { name: string; name_en?: string; key: string; imageUrl: string }>();
    
    categoryProducts.forEach(product => {
      if (product.sub_category && product.subCategoryKey && !subCategoryMap.has(product.subCategoryKey)) {
        subCategoryMap.set(product.subCategoryKey, {
          name: product.sub_category,
          name_en: product.sub_category_en,
          key: product.subCategoryKey,
          imageUrl: product.image_url!, 
        });
      }
    });

    if (subCategoryMap.size === 0) {
      return [];
    }

    return Array.from(subCategoryMap.values());
  }, [allProducts, selectedCategory]);

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    if (selectedCategory !== 'all') {
      products = products.filter(p => p.categoryKey === selectedCategory);
    }

    if (selectedSubCategory !== 'all') {
      products = products.filter(p => p.subCategoryKey === selectedSubCategory);
    }

    if (searchQuery.length >= 2) {
      products = products.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.title_en && p.title_en.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return products;
  }, [allProducts, selectedCategory, selectedSubCategory, searchQuery]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');

        if (newValue.length >= 2) {
            params.set('search', newValue);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        } else if (newValue.length === 0) {
            params.delete('search');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, 500); 
  }

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, currentPage]);
  
  const categoryName = useMemo(() => {
    if (selectedSubCategory !== 'all') {
      const subCategory = subCategories.find(sc => sc.key === selectedSubCategory);
      if (!subCategory) return t('home.allProducts');
      return language === 'en' && subCategory.name_en ? subCategory.name_en : subCategory.name;
    }
    if (selectedCategory !== 'all') {
      const category = categories.find(c => c.key === selectedCategory);
      if (!category) return t('home.allProducts');
      return language === 'en' && category.name_en ? category.name_en : category.name;
    }
    return t('home.allProducts');
  }, [selectedCategory, selectedSubCategory, categories, subCategories, t, language]);


  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <main className="container mx-auto px-4 py-1 sm:px-6 lg:px-8">
        <div className="text-center py-4">
             <h1 className="text-4xl font-bold text-white mb-4">{t('home.title')}</h1>
            <p className="text-2xl font-bold text-lime-400">{t('home.delivery')}</p>
        </div>
        <div className="mb-2">
            <div className="mb-2 max-w-md mx-auto">
              <input
                type="text"
                placeholder={t('home.searchPlaceholder')}
                value={inputValue}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 rounded-full bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>
            <div className="w-full px-2 sm:px-4 mt-4 hidden md:block">
                <CategoryCarousel categories={categories} selectedCategory={selectedCategory} onSelectCategory={handleCategoryChange} />
                {subCategories.length > 0 && (
                    <div className="mt-4">
                        <CategoryCarousel categories={subCategories} selectedCategory={selectedSubCategory} onSelectCategory={handleSubCategoryChange} />
                    </div>
                )}
            </div>
        </div>

<section>
 <h2 className="text-3xl font-bold text-white my-8">{categoryName}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {paginatedProducts.map((product, idx) => {
              const imageUrls = [product.image_url, ...(product.image_urls || [])].filter(url => url && url.trim() !== '');
              const uniqueImageUrls = [...new Set(imageUrls)];
              const hasMultipleImages = uniqueImageUrls.length > 1;
              
              const title = (language === 'en' && product.title_en) ? product.title_en : product.title;
              const category = (language === 'en' && product.category_en) ? product.category_en : product.category;
              const sub_category = (language === 'en' && product.sub_category_en) ? product.sub_category_en : product.sub_category;

              return (
                <div 
                  key={`product-${product.id}-${currentPage}-${idx}`}
                  className="bg-gray-800/40 rounded-xl shadow-lg overflow-hidden flex flex-col group transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl hover:shadow-lime-500/20"
                >
                    <div className="relative flex-grow">
                      <Link href={`/products/${product.categoryKey}/${product.id}?page=${currentPage}&category=${selectedCategory}${selectedSubCategory !== 'all' ? `&subcategory=${selectedSubCategory}` : ''}`} className="block h-full">
                          <div className="overflow-hidden h-64">
                            {hasMultipleImages ? (
                              <Swiper
                                modules={[Pagination]}
                                pagination={{ clickable: true }}
                                className="w-full h-full"
                                loop={true}
                              >
                                {uniqueImageUrls.map((url, index) => (
                                  <SwiperSlide key={`${product.id}-${index}-${url}`}>
                                    <img 
                                      src={url} 
                                      alt={`${title} - ${t('home.photo', { number: index + 1 })}`}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                                    />
                                  </SwiperSlide>
                                ))}
                              </Swiper>
                            ) : (
                              <img 
                                src={product.image_url} 
                                alt={title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                              />
                            )}
                          </div>
                          <div className="p-5">
                              <h3 className="text-xl font-bold mb-2 truncate group-hover:text-lime-400 transition-colors duration-300">{title}</h3>
                              <p className="text-gray-400 text-sm mb-3">{category}{sub_category ? ` / ${sub_category}` : ''}</p>
                               <div className="flex items-center flex-wrap gap-2">
                                   <div className="flex items-baseline gap-2 mr-auto">
                                      <p className="text-2xl font-semibold text-lime-500 whitespace-nowrap">{calculateDisplayPrice(product.price)} ₾</p>
                                  </div>
                                  {product.in_stock && <span className="text-sm font-semibold text-green-400 shrink-0">{t('home.inStock')}</span>}
                              </div>
                          </div>
                      </Link>
                    </div>
                    <div className="p-5 pt-0 mt-auto">
                        <QuantityInput product={product} />
                    </div>
                </div>
              )
            })
          }
        </div>
</section>

        {totalPages > 1 && (
            <div className="mt-16 flex justify-center items-center gap-4">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-500/30 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                >
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>

                <span className="text-lg font-semibold text-white bg-gray-800/80 rounded-full px-5 py-2 shadow-inner">{t('home.page', { current: currentPage, total: totalPages })}</span>

                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-full bg-lime-500 text-gray-900 font-bold hover:bg-lime-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-500/30 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                >
                    <ChevronRightIcon className="h-6 w-6" />
                </button>
            </div>
        )}

      </main>
    </div>
  );
}
