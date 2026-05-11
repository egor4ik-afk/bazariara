'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface HomeHeaderProps {
  categoryKey?: string;
  // Данные из БД
  categoryNames?: { ru: string; en?: string | null; ka?: string | null };
  currentPage?: number;  // ← новый проп
}

export default function HomeHeader({ categoryKey, categoryNames, currentPage }: HomeHeaderProps) {
  const { t, language } = useLanguage();

  let title = t('home.title');
  if (categoryNames) {
    if (language === 'en') title = categoryNames.en || categoryNames.ru;
    else if (language === 'ka') title = categoryNames.ka || categoryNames.ru;
    else title = categoryNames.ru;
  }

  // Добавляем номер страницы в H1 для страниц пагинации
  const pageLabel = currentPage && currentPage > 1 ? ` — страница ${currentPage}` : '';

  return (
    <div className="text-center py-4">
      <h1 className="text-4xl font-bold text-white mb-4">{title}{pageLabel}</h1>
      <p className="text-2xl font-bold text-lime-400">{t('home.delivery')}</p>
      <h2 className="text-3xl font-bold text-white mt-8">{t('home.allProducts')}</h2>
    </div>
  );
}
