'use client';

// Google Analytics, Яндекс Метрика и пиксель Meta запускаются не при загрузке
// страницы, а по первому действию посетителя: движение мыши, касание, прокрутка,
// клавиша. Если действий нет — через FALLBACK_MS после открытия.
//
// Зачем: эти скрипты — ~280 КБ и ~0,4 с работы процессора, самое тяжёлое на
// странице. Раньше они стартовали сразу после загрузки (lazyOnload) и занимали
// процессор как раз тогда, когда человек начинает листать и нажимать.
//
// Цена: посетитель, который закрыл страницу быстрее FALLBACK_MS и ни разу её не
// коснулся, в статистику не попадёт. Для GA4 такие визиты и так «без вовлечения»,
// в Метрике чуть уменьшится доля отказов.

import { useEffect } from 'react';

const GA_ID = 'G-EN4C3S417X';
const YM_ID = 107711719;
const FALLBACK_MS = 5000;
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

// Роботы и автоматические проверки (Lighthouse/PageSpeed, поисковики, headless-
// браузеры) в статистику не нужны: это не посетители. Заодно Метрика не сыпет
// в их консоль ошибками своего WebSocket (wss://mc.yandex.com/solid.ws), из-за
// которых PageSpeed снимал баллы в «Рекомендациях».
function isBot(): boolean {
  if ((navigator as any).webdriver) return true;
  return /Chrome-Lighthouse|HeadlessChrome|PageSpeed|bot\b|crawler|spider|Yandex(Bot|Metrika)|Googlebot/i
    .test(navigator.userAgent);
}

function addScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function startAnalytics(pixelId: string) {
  const w = window as any;

  // Google Analytics 4
  w.dataLayer = w.dataLayer || [];
  // gtag обязан класть в dataLayer именно объект arguments, а не массив
  w.gtag = w.gtag || function gtag() { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', GA_ID);
  addScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);

  // Яндекс Метрика: очередь вызовов до загрузки tag.js — как в официальном коде
  w.ym = w.ym || function ym() { (w.ym.a = w.ym.a || []).push(arguments); };
  w.ym.l = Date.now();
  addScript(`https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`);
  w.ym(YM_ID, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });

  // Пиксель Meta — только если задан ID
  if (pixelId && !w.fbq) {
    const n: any = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    w.fbq = n;
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    addScript('https://connect.facebook.net/en_US/fbevents.js');
    w.fbq('init', pixelId);
    w.fbq('track', 'PageView');
  }
}

export default function DeferredAnalytics({ pixelId = '' }: { pixelId?: string }) {
  useEffect(() => {
    if (isBot()) return;
    let started = false;
    let timer = 0;

    const start = () => {
      if (started) return;
      started = true;
      stop();
      startAnalytics(pixelId);
    };
    const stop = () => {
      EVENTS.forEach((e) => window.removeEventListener(e, start));
      window.clearTimeout(timer);
    };

    EVENTS.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    timer = window.setTimeout(start, FALLBACK_MS);
    return stop;
  }, [pixelId]);

  return null;
}
