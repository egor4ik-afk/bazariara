export const revalidate = 600; // синхронно с revalidate в getCategories/getProducts (unstable_cache)
import { headers } from 'next/headers';
import Welcome from '@/components/home/Welcome';
import { homeMetadata, type SearchParams } from './home-metadata';

export const generateMetadata = homeMetadata;

/**
 * /{locale} без параметров — приветственная страница.
 *
 * Категории (/{locale}?category=X) middleware отдаёт в app/category-page:
 * адреса для людей и поисковиков те же, но это отдельный маршрут. Пока
 * каталог жил в этом же файле, главная тянула весь его клиентский JS —
 * слайдер Swiper, карточки, фильтры, около 100 КБ, — хотя не показывала их.
 */
export default async function HomePage() {
  const lh = (await headers()).get('x-locale');
  const locale: 'ru' | 'en' | 'ka' = lh === 'en' || lh === 'ka' ? lh : 'ru';
  return <Welcome locale={locale} />;
}
