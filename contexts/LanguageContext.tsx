'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { translations } from '@/lib/translations';

export type Language = 'ru' | 'en' | 'ka';
const LOCALES: Language[] = ['ru', 'en', 'ka'];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getLocaleFromPath(pathname: string): Language {
  const first = pathname.split('/')[1];
  return (LOCALES as string[]).includes(first) ? (first as Language) : 'ru';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const language = getLocaleFromPath(pathname);

  // html lang + cookie синхронизируем с текущим URL (на случай прямого
  // захода / кнопки "назад", когда middleware уже не перехватывает запрос).
  useEffect(() => {
    document.documentElement.lang = language;
    document.cookie = `language=${language}; path=/; max-age=31536000`;
  }, [language]);

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    const rest = pathname.replace(/^\/(ru|en|ka)(?=\/|$)/, '');
    router.push(`/${lang}${rest}`);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const current = translations[language] as Record<string, any>;
    const keys = key.split('.');
    let value: any = current;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return key;
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) =>
        params[paramKey]?.toString() || match
      );
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}