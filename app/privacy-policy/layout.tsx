import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | BAZARI ARA',
  description: 'Политика обработки персональных данных интернет-магазина BAZARI ARA. Как мы собираем и защищаем ваши данные.',
  alternates: {
    canonical: 'https://bazariara.ge/privacy-policy',
  },
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
