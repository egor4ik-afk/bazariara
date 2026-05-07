import { ShieldCheckIcon, CubeTransparentIcon, InboxIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getTranslations } from '@/lib/server-translations';

const ReturnRuleCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="bg-gray-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg transform hover:scale-105 transition-transform duration-300">
    <div className="p-4 bg-lime-500/10 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-lime-400 mb-2">{title}</h3>
    <p className="text-gray-300">{text}</p>
  </div>
);

export default function ReturnsPage() {
  const { t } = getTranslations();

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-lime-300 to-green-500 mb-4">
            {t('returns.title')}
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            {t('returns.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <ReturnRuleCard
            icon={<ShieldCheckIcon className="w-10 h-10 text-lime-400" />}
            title={t('returns.returnPeriod')}
            text={t('returns.returnPeriodText')}
          />
          <ReturnRuleCard
            icon={<CubeTransparentIcon className="w-10 h-10 text-lime-400" />}
            title={t('returns.itemCondition')}
            text={t('returns.itemConditionText')}
          />
          <ReturnRuleCard
            icon={<InboxIcon className="w-10 h-10 text-lime-400" />}
            title={t('returns.packaging')}
            text={t('returns.packagingText')}
          />
        </div>

        <div className="bg-yellow-900/20 border border-yellow-600/50 text-yellow-300 rounded-2xl p-8 flex items-center gap-6 max-w-4xl mx-auto">
          <div className="flex-shrink-0">
             <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">{t('returns.importantNote')}</h2>
            <p className="text-lg">
              {t('returns.importantNoteText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
