import { translations } from '@/lib/translations';
import { headers } from 'next/headers';

type Language = 'ru' | 'en' | 'ka';

// TODO: Определять язык из cookies или headers
const getLanguage = (): Language => {
  return 'ru'; // Для SSR всегда используем 'ru' по умолчанию
};

export const getTranslations = () => {
  const lang = getLanguage();

  const t = (key: string, params?: Record<string, string | number>): string => {
    const current = translations[lang] as Record<string, any>;
    const keys = key.split('.');
    let value: any = current;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key} for lang: ${lang}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) =>
        params[paramKey]?.toString() || match
      );
    }
    return value;
  };

  return { t, lang };
};
