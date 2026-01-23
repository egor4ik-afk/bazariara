'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations } from '@/lib/translations';

type Language = 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Изначально можно оставить 'en' или 'ru', это изменится после маунта
  const [language, setLanguageState] = useState<Language>('en'); 
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedLanguage = localStorage.getItem('language') as Language;

    if (savedLanguage && ['ru', 'en'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    } else {
      // ЛОГИКА ИЗМЕНЕНА ЗДЕСЬ:
      const browserLang = navigator.language.split('-')[0];
      
      // Если язык браузера 'ru' -> ставим 'ru'
      // Если любой другой (включая en, de, fr...) -> ставим 'en'
      const defaultLang = browserLang === 'ru' ? 'ru' : 'en';
      
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
    if (isClient) {
      document.documentElement.lang = language;
    }
  }, [language, isClient]);

  const getTranslation = (key: string, params?: Record<string, string | number>): string => {
    const currentTranslations = translations[language];
    const keys = key.split('.');
    let value: any = currentTranslations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return key;
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: getTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}