'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

type ThemeContextValue = {
  /** Что выбрал пользователь, включая 'system'. */
  theme: ThemeChoice;
  /** Что реально показано сейчас — 'system' уже развёрнут. */
  resolved: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
  /** Циклический перебор для одной кнопки: светлая → тёмная → системная. */
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolved: 'light',
  setTheme: () => {},
  cycleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;

  // Цвет строки состояния браузера на мобильных — иначе в тёмной теме
  // над шапкой остаётся белая полоса.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#121713' : '#F8F9F4');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Инициализируемся тем, что уже проставил инлайн-скрипт в <head>,
  // чтобы первый рендер совпал с реальным состоянием DOM.
  const [theme, setThemeState] = useState<ThemeChoice>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    const choice: ThemeChoice =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    const res = choice === 'system' ? systemTheme() : choice;

    setThemeState(choice);
    setResolved(res);
    apply(res);

    // Переходы включаем только после первой отрисовки: иначе при загрузке
    // страница заметно «переливается» из одной темы в другую.
    const id = window.setTimeout(() => {
      document.documentElement.classList.add('theme-transition');
    }, 80);
    return () => window.clearTimeout(id);
  }, []);

  // Пользователь сидит на 'system' и меняет тему в настройках ОС —
  // реагируем на лету, без перезагрузки.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const res = mq.matches ? 'dark' : 'light';
      setResolved(res);
      apply(res);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    const res = next === 'system' ? systemTheme() : next;
    setThemeState(next);
    setResolved(res);
    apply(res);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Скрипт, который выполняется до первой отрисовки и ставит класс на <html>.
 * Без него страница успевает моргнуть светлым, прежде чем React подключится —
 * особенно заметно на медленном мобильном соединении.
 *
 * Держим его максимально коротким и без зависимостей: он блокирует рендер.
 */
export const themeInitScript = `
(function(){try{
  var s=localStorage.getItem('${STORAGE_KEY}');
  var d=(s==='dark')||((s===null||s==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);
  var r=document.documentElement;
  if(d){r.classList.add('dark')}
  r.style.colorScheme=d?'dark':'light';
}catch(e){}})();
`.trim();
