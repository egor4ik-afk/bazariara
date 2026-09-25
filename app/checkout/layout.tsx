import type { Metadata } from 'next';
import { headers } from 'next/headers';

// Title без « | BAZARI ARA» — его добавляет шаблон из app/layout.tsx.
// Раньше здесь стоял бренд руками, и в выдаче он шёл дважды.
const COPY = {
  ru: { title: 'Оформление заказа', description: undefined },
  en: { title: 'Checkout', description: undefined },
  ka: { title: 'შეკვეთის გაფორმება', description: undefined },
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
      canonical: `https://bazariara.ge/${locale}/checkout`,
    },
  };
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
