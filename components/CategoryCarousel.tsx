import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Category } from '@/lib/types';


export default function CategoryCarousel({ categories }: { categories: Category[] }) {
  const { language, t } = useLanguage();

  const getCategoryName = (category: Category) => {
    switch (language) {
      case 'en':
        return category.name_en;
      case 'ru':
        return category.name;
      case 'ka':
        return category.name_ka;
      default:
        return category.name;
    }
  };

  return (
    <div className="w-full overflow-x-auto py-4 mb-6">
      <div className="flex gap-3 px-4 sm:px-0">
        {/* Кнопка \"Все товары\" */}
        <Link
          href="/"
          className="flex-shrink-0 px-5 py-3 rounded-full text-base font-semibold bg-cream-200 hover:bg-brand-200/50 text-ink-900 transition-colors shadow-sm"
        >
          {t('categories.all')}
        </Link>
        {/* Кнопки категорий */}
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/?category=${category.key}`}
            className="flex-shrink-0 px-5 py-3 rounded-full text-base font-semibold bg-cream-200 hover:bg-brand-200/50 text-ink-900 transition-colors shadow-sm"
          >
            {getCategoryName(category)}
          </Link>
        ))}
      </div>
    </div>
  );
}
