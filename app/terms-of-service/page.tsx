'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsOfServicePage() {
  const { t } = useLanguage();
  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-lg shadow-xl p-6 md:p-8 lg:p-10 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-700 mb-6">{t('terms.title')}</h1>
          
          <div className="space-y-4 text-ink-700">
            <p>{t('terms.intro')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('terms.section1Title')}</h2>
            <p>{t('terms.section1Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('terms.section2Title')}</h2>
            <p>{t('terms.section2Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('terms.section3Title')}</h2>
            <p>{t('terms.section3Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('terms.section4Title')}</h2>
            <p>{t('terms.section4Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('terms.section5Title')}</h2>
            <p>{t('terms.section5Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('terms.section6Title')}</h2>
            <p>{t('terms.section6Text')}</p>

            <p className="pt-6">{t('terms.contact')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
