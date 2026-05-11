import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Правила возврата товаров | BAZARI ARA',
  description: 'Условия и сроки возврата товаров в интернет-магазине BAZARI ARA в Тбилиси. Возврат в течение 7 дней.',
  alternates: {
    canonical: 'https://bazariara.ge/returns',
  },
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
