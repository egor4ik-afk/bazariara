'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations } from '@/lib/translations';

export type Language = 'ru' | 'en' | 'ka';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('language') as Language;
    if (saved && ['ru', 'en', 'ka'].includes(saved)) {
      setLanguageState(saved);
    } else {
      const browserLang = navigator.language.split('-')[0];
      const defaultLang: Language =
        browserLang === 'ru' ? 'ru' :
        browserLang === 'ka' ? 'ka' : 'en';
      setLanguageState(defaultLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (isClient) {
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (isClient) document.documentElement.lang = language;
  }, [language, isClient]);

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
