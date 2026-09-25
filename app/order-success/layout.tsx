import type { Metadata } from 'next';
import { headers } from 'next/headers';

// Title без « | BAZARI ARA» — его добавляет шаблон из app/layout.tsx.
// Раньше здесь стоял бренд руками, и в выдаче он шёл дважды.
const COPY = {
  ru: { title: 'Заказ оформлен', description: undefined },
  en: { title: 'Order placed', description: undefined },
  ka: { title: 'შეკვეთა გაფორმებულია', description: undefined },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lh = (await headers()).get('x-locale');
  const locale = lh === 'en' || lh === 'ka' ? lh : 'ru';
  const c = COPY[locale];
  return {
    title: c.title,
    description: c.description,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
    alternates: {
      // С префиксом языка: адрес без него middleware редиректит
      canonical: `https://bazariara.ge/${locale}/order-success`,
    },
  };
}

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
