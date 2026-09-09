/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Основной зелёный. Приглушённый, ближе к листу и травяному, а не
        // к неоновому lime — он читается как «эко», а не как «энергетик».
        brand: {
          50:  '#F3F8EE',
          100: '#E4F0D9',
          200: '#C9E1B5',
          300: '#A6CE8A',
          400: '#7FB65C',
          500: '#5E9C3C',
          600: '#487B2C',
          700: '#396124',
          800: '#2E4D1F',
          900: '#26401C',
        },
        // Фон страницы: не чистый белый, а тёплый бумажный.
        // На белых карточках даёт мягкий контраст без серости.
        cream: {
          50:  '#FDFDFB',
          100: '#F8F9F4',
          200: '#F1F4EA',
          300: '#E7EBDD',
        },
        // Нейтральные: тёплые, чтобы не спорить с зелёным.
        ink: {
          900: '#1C2317',
          800: '#2C3527',
          700: '#44503C',
          600: '#5E6B55',
          500: '#7C8874',
          400: '#A3AC9C',
          300: '#C7CDC1',
          200: '#E2E6DD',
          100: '#EFF2EC',
        },
        clay: '#C2703D',  // акцент для «скоро» / бейджей урожая
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 1px 2px rgba(28,35,23,.04), 0 4px 16px rgba(28,35,23,.06)',
        cardHover: '0 2px 6px rgba(28,35,23,.06), 0 12px 32px rgba(28,35,23,.10)',
      },
      borderRadius: { xl2: '1.125rem' },
    },
  },
  plugins: [],
};