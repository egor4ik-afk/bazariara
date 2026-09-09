'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPolicyPage() {
  const { t } = useLanguage();
  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-lg shadow-xl p-6 md:p-8 lg:p-10 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-700 mb-6">{t('privacy.title')}</h1>
          
          <div className="space-y-4 text-ink-700">
            <p>{t('privacy.intro')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('privacy.section1Title')}</h2>
            <p>{t('privacy.section1Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('privacy.section2Title')}</h2>
            <p>{t('privacy.section2Text')}</p>
            <ul className="list-disc list-inside pl-4 space-y-2">
              <li>{t('privacy.section2Item1')}</li>
              <li>{t('privacy.section2Item2')}</li>
              <li>{t('privacy.section2Item3')}</li>
              <li>{t('privacy.section2Item4')}</li>
            </ul>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('privacy.section3Title')}</h2>
            <p>{t('privacy.section3Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('privacy.section4Title')}</h2>
            <p>{t('privacy.section4Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('privacy.section5Title')}</h2>
            <p>{t('privacy.section5Text')}</p>

            <h2 className="text-2xl font-semibold text-brand-600 pt-4">{t('privacy.section6Title')}</h2>
            <p>{t('privacy.section6Text')}</p>

            <p className="pt-6">{t('privacy.contact')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
