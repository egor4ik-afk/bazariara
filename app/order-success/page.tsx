'use client';

import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OrderSuccessPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900 flex items-center justify-center p-4">
      <main className="max-w-md w-full bg-surface rounded-lg shadow-lg p-8 text-center">
        <CheckCircleIcon className="w-20 h-20 text-brand-700 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">{t('orderSuccess.title')}</h1>
        <p className="text-ink-700 mb-8">{t('orderSuccess.thanks')}</p>
        <p className="text-ink-600 mb-10">{t('orderSuccess.contact')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/orders"
            className="inline-block bg-brand-600 text-on-brand font-bold py-3 px-6 rounded-lg hover:bg-brand-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-600/30"
          >
            {t('orderSuccess.viewOrders')}
          </Link>
          <Link
            href="/"
            className="inline-block bg-ink-100 text-ink-900 font-medium py-3 px-6 rounded-lg hover:bg-ink-200 transition-colors duration-300"
          >
            {t('orderSuccess.backHome')}
          </Link>
        </div>
      </main>
    </div>
  );
}