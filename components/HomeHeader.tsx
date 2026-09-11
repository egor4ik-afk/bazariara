'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface HomeHeaderProps {
  categoryKey?: string;
  categoryNames?: { ru: string; en?: string | null; ka?: string | null };
  currentPage?: number;
}

/**
 * H1 главной — эмоциональный, по ТЗ (раздел 14 и таблица 1):
 * «Грузия, которую хочется увезти с собой».
 *
 * Ключевые запросы держит SEO Title и структура категорий, а не H1.
 * Старый вариант «Товары для дома, сада и отдыха» противоречил и
 * позиционированию, и текущему ассортименту: ни дома, ни сада в каталоге
 * больше нет.
 *
 * При выбранной категории H1 остаётся названием категории — там нужен
 * коммерческий интент, а не бренд.
 */
export default function HomeHeader({ categoryNames, currentPage }: HomeHeaderProps) {
  const { t, language } = useLanguage();

  const isCategory = Boolean(categoryNames);
  const pageLabel = currentPage && currentPage > 1 ? ` — ${t('home.page')} ${currentPage}` : '';

  if (isCategory) {
    const title =
      language === 'en' ? (categoryNames!.en || categoryNames!.ru)
      : language === 'ka' ? (categoryNames!.ka || categoryNames!.ru)
      : categoryNames!.ru;

    return (
      <div className="text-center py-4">
        <h1 className="text-3xl md:text-4xl font-bold text-ink-900 mb-3">
          {title}{pageLabel}
        </h1>
        <p className="text-lg font-semibold text-brand-700">{t('home.delivery')}</p>
      </div>
    );
  }

  return (
    <div className="text-center py-6 md:py-10">
      <h1 className="text-3xl md:text-5xl font-extrabold text-ink-900 mb-4 leading-tight">
        {t('home.heroTitle')}{pageLabel}
      </h1>
      <p className="text-base md:text-lg text-ink-700 max-w-2xl mx-auto leading-relaxed">
        {t('home.heroSubtitle')}
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-ink-900 mt-10">
        {t('home.allProducts')}
      </h2>
    </div>
  );
}
