'use client';

import { useEffect, useState } from 'react';
import { useTheme, type ThemeChoice } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/solid';

const ICONS: Record<ThemeChoice, typeof SunIcon> = {
  light:  SunIcon,
  dark:   MoonIcon,
  system: ComputerDesktopIcon,
};

/**
 * Одна кнопка вместо выпадающего списка: светлая → тёмная → системная.
 * В шапке и так тесно на мобильных, а третий дропдаун рядом с языком
 * съел бы остаток ширины.
 */
export default function ThemeToggle() {
  const { theme, resolved, cycleTheme } = useTheme();
  const { t } = useLanguage();

  // До монтирования не рендерим иконку: на сервере тема неизвестна,
  // и разметка не совпала бы с клиентской.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const Icon = ICONS[theme];

  const label =
    theme === 'light'  ? t('theme.light')
  : theme === 'dark'   ? t('theme.dark')
  :                      t('theme.system');

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={label}
      aria-label={label}
      className="flex items-center justify-center h-9 w-9 rounded-lg bg-ink-100
                 hover:bg-ink-200 text-ink-800 transition-colors shrink-0"
    >
      {mounted ? (
        <Icon className="h-5 w-5" />
      ) : (
        <span className="h-5 w-5" aria-hidden="true" />
      )}
      {/* Для скринридеров: что показано сейчас, если выбран режим «системная» */}
      {mounted && theme === 'system' && (
        <span className="sr-only">
          {resolved === 'dark' ? t('theme.dark') : t('theme.light')}
        </span>
      )}
    </button>
  );
}
