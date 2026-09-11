'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  originType?: string | null;   // georgian_local | georgian_producer | imported | unknown
  producerSlug?: string | null;
  producerName?: string | null;
  regionSlug?: string | null;
  regionName?: string | null;
};

/**
 * Блок «Откуда этот товар?» (ТЗ раздел 9, таблица 11).
 *
 * Главное правило: импортный товар не должен выглядеть грузинским.
 * Поэтому «Сделано в Грузии» показывается только при origin_type =
 * georgian_local или georgian_producer. У палатки Naturehike будет
 * указан бренд — и ничего больше. Если данных нет, блок не рендерится
 * вообще: выдумывать регион нельзя.
 */
export default function ProductOrigin({
  originType, producerSlug, producerName, regionSlug, regionName,
}: Props) {
  const { t, language } = useLanguage();

  const isGeorgian = originType === 'georgian_local' || originType === 'georgian_producer';
  const hasAnything = isGeorgian || producerName || (isGeorgian && regionName);

  if (!hasAnything) return null;

  return (
    <div className="mt-6 p-4 rounded-2xl bg-cream-200 border border-ink-200">
      <p className="text-xs uppercase tracking-wide text-ink-500 mb-3 font-semibold">
        {t('origin.title')}
      </p>

      <div className="space-y-2 text-sm">
        {isGeorgian && (
          <p className="flex items-center gap-2 text-ink-800 font-semibold">
            <span aria-hidden="true">🇬🇪</span>
            {t('origin.madeInGeorgia')}
          </p>
        )}

        {producerName && (
          <p className="flex items-center gap-2 flex-wrap text-ink-700">
            <span className="text-ink-500">{t('origin.producer')}:</span>
            {producerSlug ? (
              <Link
                href={`/${language}/farmers/${producerSlug}`}
                className="font-bold text-brand-700 hover:underline"
              >
                {producerName} →
              </Link>
            ) : (
              <span className="font-bold text-ink-900">{producerName}</span>
            )}
          </p>
        )}

        {isGeorgian && regionName && (
          <p className="flex items-center gap-2 flex-wrap text-ink-700">
            <span className="text-ink-500">{t('origin.region')}:</span>
            {regionSlug ? (
              <Link
                href={`/${language}/regions/${regionSlug}`}
                className="font-semibold text-brand-700 hover:underline"
              >
                {regionName}
              </Link>
            ) : (
              <span className="font-semibold text-ink-900">{regionName}</span>
            )}
          </p>
        )}

        {originType === 'imported' && producerName && (
          <p className="text-xs text-ink-500 pt-1">{t('origin.importedNote')}</p>
        )}
      </div>
    </div>
  );
}
