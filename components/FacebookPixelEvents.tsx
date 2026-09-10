// 'use client';

// import { usePathname, useSearchParams } from 'next/navigation';
// import { useEffect } from 'react';

// declare global {
//   interface Window {
//     fbq: (...args: any[]) => void;
//   }
// }

// export function FacebookPixelEvents() {
//   const pathname = usePathname();
//   // searchParams нужен, чтобы пиксель срабатывал, даже если меняются только параметры в URL (например, фильтры)
//   const searchParams = useSearchParams(); 

//   useEffect(() => {
//     if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      
//       // 1. Стандартное событие просмотра любой страницы
//       window.fbq('track', 'PageView');

//       // 2. Воронка продаж: Корзина
//       if (pathname.includes('/cart')) {
//         // У Facebook нет стандартного события "Просмотр корзины", поэтому шлем кастомное
//         window.fbq('trackCustom', 'ViewCart');
//       }

//       // 3. Воронка продаж: Оформление заказа
//       if (pathname.includes('/checkout')) {
//         window.fbq('track', 'InitiateCheckout');
//       }

//       // 4. Воронка продаж: Успешная покупка
//       if (pathname.includes('/order-success')) {
//         // Базовое событие покупки (без точной суммы заказа)
//         window.fbq('track', 'Purchase', { currency: 'GEL' });
//       }

//     }
//   }, [pathname, searchParams]);

//   return null;
// }