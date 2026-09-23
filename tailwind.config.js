/** @type {import('tailwindcss').Config} */

// Цвет через CSS-переменную. Формат «R G B» + <alpha-value> обязателен,
// иначе перестанут работать модификаторы прозрачности (bg-brand-600/20).
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const scale = (prefix, steps) =>
  Object.fromEntries(steps.map((s) => [s, v(`${prefix}-${s}`)]));

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './contexts/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: scale('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        cream: scale('cream', [50, 100, 200, 300]),
        ink:   scale('ink',   [100, 200, 300, 400, 500, 600, 700, 800, 900]),

        // Поверхности карточек и хедера. Раньше здесь стоял bg-white,
        // но белый — константа Tailwind, в тёмной теме её не переопределить.
        surface:   v('surface'),
        'surface-2': v('surface-2'),

        clay: v('clay'),
        'on-brand': v('on-brand'),
      },
      fontFamily: {
        // Системный стек без var(). Прежний вариант начинался с
        // var(--font-sans), которая нигде не определена, — по правилам CSS
        // это делает недействительным ВСЁ объявление, и браузер падал
        // на Times. Запасные шрифты после var() не рассматривались вовсе.
        //
        // Системные шрифты, а не веб-шрифт: ноль загрузок, лучше LCP, и
        // грузинский покрыт — в Segoe UI, Roboto и SF есть mkhedruli.
        sans: [
          'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
          'Noto Sans', 'Noto Sans Georgian', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      boxShadow: {
        card:      '0 1px 2px rgb(var(--shadow-rgb) / .05), 0 4px 16px rgb(var(--shadow-rgb) / .07)',
        cardHover: '0 2px 6px rgb(var(--shadow-rgb) / .07), 0 12px 32px rgb(var(--shadow-rgb) / .12)',
      },
      borderRadius: { xl2: '1.125rem' },
    },
  },
  plugins: [],
};
