import { useTranslations } from 'next-intl';

interface CategoryNames {
  [key: string]: { [lang: string]: string };
}

interface HomeHeaderProps {
  categoryKey?: string;
  categoryNames: CategoryNames;
  currentPage: number;
}

// Утилита для получения заголовка и описания на основе категории
const getCategoryContent = (t: any, categoryKey: string | undefined, categoryNames: CategoryNames) => {
  if (categoryKey && categoryNames[categoryKey]) {
    const names = categoryNames[categoryKey];
    return {
      title: names.ru, // Замените на нужный язык
      description: t('categories.description', { category: names.ru.toLowerCase() }),
    };
  } else {
    return {
      title: t('home.title'),
      description: t('home.description'),
    };
  }
};

export default function HomeHeader({ categoryKey, categoryNames, currentPage }: HomeHeaderProps) {
  const t = useTranslations();

  const { title, description } = getCategoryContent(t, categoryKey, categoryNames);

  // Не отображать заголовок и описание на страницах, кроме первой
  if (currentPage > 1) {
    return null;
  }

  return (
    <div className="text-center py-10 md:py-16">
      <h1 className="text-4xl md:text-5xl font-extrabold text-brand-700 mb-4">
        {title}
      </h1>
      <p className="text-lg md:text-xl text-ink-700 max-w-3xl mx-auto">
        {description}
      </p>
    </div>
  );
}
