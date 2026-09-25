import type { Metadata } from 'next';
import { headers } from 'next/headers';

// Title без « | BAZARI ARA» — его добавляет шаблон из app/layout.tsx.
// Раньше здесь стоял бренд руками, и в выдаче он шёл дважды.
const COPY = {
  ru: { title: 'Правила возврата товаров', description: 'Условия возврата товаров в BAZARI ARA: вернуть можно в течение 7 дней. Что принимаем обратно и как оформить возврат при доставке по Тбилиси.' },
  en: { title: 'Returns Policy', description: 'Returns at BAZARI ARA: items can be returned within 7 days. What we accept back and how to arrange a return for orders delivered in Tbilisi.' },
  ka: { title: 'დაბრუნების წესები', description: 'BAZARI ARA-ში პროდუქციის დაბრუნება შესაძლებელია 7 დღის განმავლობაში. რას ვიღებთ უკან და როგორ გავაფორმოთ დაბრუნება.' },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lh = (await headers()).get('x-locale');
  const locale = lh === 'en' || lh === 'ka' ? lh : 'ru';
  const c = COPY[locale];
  return {
    title: c.title,
    description: c.description,
    alternates: {
      // С префиксом языка: адрес без него middleware редиректит
      canonical: `https://bazariara.ge/${locale}/returns`,
    },
  };
}

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
