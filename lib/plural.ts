/**
 * Склонение по числу. Раньше везде было «${n} товаров» — отсюда
 * «4 товаров», «1 производителей», «2 товаров» на главной.
 *
 * Русский: one (1, 21, 31…), few (2–4, 22–24…), many (0, 5–20, 25…).
 * Английский: one / other. Грузинский существительное после числа
 * не меняет — всегда единственное число.
 *
 * Intl.PluralRules знает эти правила сам, поэтому таблиц нет.
 */

type Locale = 'ru' | 'en' | 'ka';

const WORDS = {
  products: {
    ru: { one: 'товар', few: 'товара', many: 'товаров' },
    en: { one: 'product', other: 'products' },
    ka: 'პროდუქტი',
  },
  producers: {
    ru: { one: 'производитель', few: 'производителя', many: 'производителей' },
    en: { one: 'producer', other: 'producers' },
    ka: 'მწარმოებელი',
  },
  articles: {
    ru: { one: 'статья', few: 'статьи', many: 'статей' },
    en: { one: 'article', other: 'articles' },
    ka: 'სტატია',
  },
} as const;

export type PluralWord = keyof typeof WORDS;

export function plural(n: number, word: PluralWord, locale: Locale): string {
  const w = WORDS[word];
  if (locale === 'ka') return `${n} ${w.ka}`;

  const rule = new Intl.PluralRules(locale === 'en' ? 'en' : 'ru').select(n);
  if (locale === 'en') return `${n} ${rule === 'one' ? w.en.one : w.en.other}`;

  const form = rule === 'one' ? w.ru.one : rule === 'few' ? w.ru.few : w.ru.many;
  return `${n} ${form}`;
}
