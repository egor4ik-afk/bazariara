import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { getTranslations } from '@/lib/server-translations';

export default function OrderSuccessPage() {
  const { t } = getTranslations();

  return (
    <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center p-4">
      <main className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <CheckCircleIcon className="w-20 h-20 text-lime-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">{t('orderSuccess.title')}</h1>
        <p className="text-gray-300 mb-8">{t('orderSuccess.thanks')}</p>
        <p className="text-gray-400 mb-10">{t('orderSuccess.contact')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/orders"
            className="inline-block bg-lime-500 text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-lime-400 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-lime-500/30"
          >
            {t('orderSuccess.viewOrders')}
          </Link>
          <Link
            href="/"
            className="inline-block bg-gray-700 text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors duration-300"
          >
            {t('orderSuccess.backHome')}
          </Link>
        </div>
      </main>
    </div>
  );
}
