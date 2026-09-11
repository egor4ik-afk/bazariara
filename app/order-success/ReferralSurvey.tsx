'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveOrderSource, REFERRAL_SOURCES } from './actions';

const STORAGE_KEY = 'lastOrderId';

/** Иконки не тащим — эмодзи читаются и не грузят бандл. */
const EMOJI: Record<string, string> = {
  instagram:  '📷',
  facebook:   '👥',
  google:     '🔍',
  friend:     '🗣️',
  telegram:   '✈️',
  passing_by: '🚶',
  other:      '💬',
};

/**
 * Вопрос «откуда узнали» задаётся ПОСЛЕ оформления, а не в чекауте.
 * В форме заказа лишнее поле снижает конверсию, а здесь человек уже купил —
 * терять нечего, и отвечают охотнее.
 *
 * Блок необязательный: пропустить можно в один клик, и он молча исчезает,
 * если id заказа неизвестен (например, страницу открыли по прямой ссылке).
 */
export default function ReferralSurvey() {
  const { t } = useLanguage();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const id = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(id)) setOrderId(id);
  }, []);

  if (!orderId || done) {
    return done ? (
      <p className="mt-8 text-sm text-brand-700 font-semibold">
        {t('referral.thanks')}
      </p>
    ) : null;
  }

  const submit = async (source: string) => {
    // «Другое» сначала раскрывает поле ввода, отправка — вторым шагом.
    if (source === 'other' && selected !== 'other') {
      setSelected('other');
      return;
    }

    setSaving(true);
    await saveOrderSource(orderId, source, source === 'other' ? comment : undefined);
    sessionStorage.removeItem(STORAGE_KEY);
    setSaving(false);
    setDone(true);
  };

  return (
    <div className="mt-10 pt-8 border-t border-ink-200 text-left">
      <h2 className="text-base font-bold text-ink-900 mb-1">
        {t('referral.question')}
      </h2>
      <p className="text-sm text-ink-600 mb-4">{t('referral.hint')}</p>

      <div className="flex flex-wrap gap-2">
        {REFERRAL_SOURCES.map((key) => (
          <button
            key={key}
            type="button"
            disabled={saving}
            onClick={() => submit(key)}
            className={
              'flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-semibold ' +
              'transition-colors disabled:opacity-50 ' +
              (selected === key
                ? 'bg-brand-600 border-brand-600 text-on-brand'
                : 'bg-surface border-ink-200 text-ink-800 hover:border-brand-300')
            }
          >
            <span aria-hidden="true">{EMOJI[key]}</span>
            {t(`referral.source.${key}`)}
          </button>
        ))}
      </div>

      {selected === 'other' && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            placeholder={t('referral.otherPlaceholder')}
            className="flex-grow px-3 py-2 rounded-lg bg-surface border border-ink-200
                       text-ink-900 text-sm outline-none focus:border-brand-400"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => submit('other')}
            className="px-4 py-2 rounded-lg bg-brand-600 text-on-brand text-sm font-semibold
                       hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {t('referral.send')}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setDone(true)}
        className="mt-3 text-xs text-ink-500 hover:text-ink-700 underline"
      >
        {t('referral.skip')}
      </button>
    </div>
  );
}
