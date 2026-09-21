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

const PREF_KEY = 'preferredLanguage';

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

  /**
   * Смена языка (ТЗ v1.0, раздел 6).
   *
   * Было router.push — он кладёт в историю новую запись. Сценарий
   * A → B → смена языка → Back возвращал на B на старом языке, а не на A:
   * «Назад» тратился на откат языка. Плюс терялись query-параметры —
   * ?category=med при переключении пропадал.
   *
   * Стало router.replace: текущая запись истории подменяется, новой
   * не появляется. A → B → смена языка → Back ведёт на A.
   */
  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    const rest = pathname.replace(/^\/(ru|en|ka)(?=\/|$)/, '');
    // window.location, а не useSearchParams: хук на уровне провайдера
    // заставил бы весь сайт рендериться на клиенте.
    const tail = typeof window !== 'undefined'
      ? window.location.search + window.location.hash
      : '';

    try { sessionStorage.setItem(PREF_KEY, lang); } catch {}
    router.replace(`/${lang}${rest}${tail}`, { scroll: false });
  };

  /**
   * «При возврате на предыдущий раздел выбранный язык должен сохраняться»
   * (ТЗ 6.1). Back после смены языка приводит на A в том языке, в котором
   * A была открыта. Если в этой вкладке язык выбирали явно — тихо
   * приводим URL к нему через replace: запись истории не добавляется,
   * значит и циклов Back/Forward быть не может.
   *
   * sessionStorage, а не cookie: предпочтение живёт в пределах вкладки.
   * Прямой заход по ссылке в новой вкладке открывается на языке ссылки,
   * как и должен, а поисковый бот sessionStorage не имеет вовсе.
   */
  useEffect(() => {
    let pref: string | null = null;
    try { pref = sessionStorage.getItem(PREF_KEY); } catch {}
    if (!pref || pref === language || !['ru', 'en', 'ka'].includes(pref)) return;

    const rest = pathname.replace(/^\/(ru|en|ka)(?=\/|$)/, '');
    router.replace(`/${pref}${rest}${window.location.search}${window.location.hash}`, { scroll: false });
  }, [pathname, language, router]);

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