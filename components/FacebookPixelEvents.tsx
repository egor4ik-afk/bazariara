'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Расширение window для TypeScript
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

// Функция для отправки события просмотра страницы
export const pageview = () => {
  if (FB_PIXEL_ID) {
    window.fbq('track', 'PageView');
  }
};

// Функция для отправки кастомных событий
export const event = (name: string, options = {}) => {
  if (FB_PIXEL_ID) {
    window.fbq('track', name, options);
  }
};


export const FacebookPixelEvents = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Проверка наличия FB_PIXEL_ID
    if (!FB_PIXEL_ID) {
      console.warn('Facebook Pixel ID is not configured.');
      return;
    }

    // Вызов pageview при смене маршрута
    pageview();

  }, [pathname]);

  return null; // Компонент не рендерит ничего в DOM
};
