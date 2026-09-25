import type { Metadata } from 'next';
import { headers } from 'next/headers';

// Title без « | BAZARI ARA» — его добавляет шаблон из app/layout.tsx.
// Раньше здесь стоял бренд руками, и в выдаче он шёл дважды.
const COPY = {
  ru: { title: 'Политика конфиденциальности', description: 'Как интернет-магазин BAZARI ARA собирает, хранит и защищает персональные данные покупателей: какие данные нужны для заказа и доставки по Тбилиси.' },
  en: { title: 'Privacy Policy', description: 'How BAZARI ARA collects, stores and protects customer personal data: what we need to process your order and deliver it across Tbilisi.' },
  ka: { title: 'კონფიდენციალურობის პოლიტიკა', description: 'როგორ აგროვებს, ინახავს და იცავს BAZARI ARA მომხმარებლების პერსონალურ მონაცემებს შეკვეთისა და მიწოდებისთვის თბილისში.' },
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
      canonical: `https://bazariara.ge/${locale}/privacy-policy`,
    },
  };
}

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
