'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Ввод телефона с выбором страны.
 *
 * Номер можно вводить как угодно — с кодом страны, с 8 или 0 в начале,
 * со скобками и дефисами, вставкой целиком из контактов:
 *   «+7 (989) 156-35-49», «79891563549», «8 989 156 35 49» → +7 989 156 35 49
 *   «+995 555 12 34 56» при выбранной России → страна сама переключится на Грузию
 * Раньше поле обрезало вставку по длине (maxLength) и не убирало код страны:
 * «79891563549» при +7 превращалось в «+7 798915635», и заказ не проходил.
 * Теперь ни одна цифра не отбрасывается молча: лишнее покажет проверка.
 *
 * Флаги — картинки из /public/flags (flag-icons, MIT): эмодзи-флаги Windows
 * не рисует и показывает вместо них буквы «GE», «RU».
 *
 * Библиотеку (libphonenumber-js весит ~145 КБ) намеренно не тащим: для
 * проверки «номер вообще похож на настоящий» хватает диапазона длин,
 * а ловить неверные номера всё равно придётся звонком.
 */

export type Country = {
  code: string;      // ISO 3166-1 alpha-2, 'XX' — другая страна
  dial: string;      // код без плюса
  name: string;      // запасное название, если браузер не знает Intl.DisplayNames
  min: number;       // минимум цифр национального номера
  max: number;
  groups: number[];  // как разбивать номер пробелами
  example: string;   // пример номера для подсказки в поле
};

/**
 * Грузия первая, дальше — страны, откуда чаще всего едут в Тбилиси.
 * Список не полный намеренно: «Другая страна» закрывает хвост, а номер
 * с плюсом любой страны из списка вставка распознает сама.
 */
export const COUNTRIES: Country[] = [
  { code: 'GE', dial: '995', name: 'Грузия',         min: 9,  max: 9,  groups: [3, 2, 2, 2],    example: '555123456' },
  { code: 'RU', dial: '7',   name: 'Россия',         min: 10, max: 10, groups: [3, 3, 2, 2],    example: '9123456789' },
  { code: 'AM', dial: '374', name: 'Армения',        min: 8,  max: 8,  groups: [2, 3, 3],       example: '77123456' },
  { code: 'AZ', dial: '994', name: 'Азербайджан',    min: 9,  max: 9,  groups: [2, 3, 2, 2],    example: '501234567' },
  { code: 'TR', dial: '90',  name: 'Турция',         min: 10, max: 10, groups: [3, 3, 2, 2],    example: '5321234567' },
  { code: 'UA', dial: '380', name: 'Украина',        min: 9,  max: 9,  groups: [2, 3, 2, 2],    example: '501234567' },
  { code: 'BY', dial: '375', name: 'Беларусь',       min: 9,  max: 9,  groups: [2, 3, 2, 2],    example: '291234567' },
  { code: 'KZ', dial: '7',   name: 'Казахстан',      min: 10, max: 10, groups: [3, 3, 2, 2],    example: '7011234567' },
  { code: 'IL', dial: '972', name: 'Израиль',        min: 8,  max: 9,  groups: [2, 3, 4],       example: '501234567' },
  { code: 'DE', dial: '49',  name: 'Германия',       min: 10, max: 11, groups: [3, 4, 4],       example: '15123456789' },
  { code: 'PL', dial: '48',  name: 'Польша',         min: 9,  max: 9,  groups: [3, 3, 3],       example: '512345678' },
  { code: 'GB', dial: '44',  name: 'Великобритания', min: 10, max: 10, groups: [4, 6],          example: '7400123456' },
  { code: 'US', dial: '1',   name: 'США',            min: 10, max: 10, groups: [3, 3, 4],       example: '2015550123' },
  { code: 'FR', dial: '33',  name: 'Франция',        min: 9,  max: 9,  groups: [1, 2, 2, 2, 2], example: '612345678' },
  { code: 'IT', dial: '39',  name: 'Италия',         min: 9,  max: 10, groups: [3, 3, 4],       example: '3123456789' },
  { code: 'ES', dial: '34',  name: 'Испания',        min: 9,  max: 9,  groups: [3, 2, 2, 2],    example: '612345678' },
  { code: 'AE', dial: '971', name: 'ОАЭ',            min: 9,  max: 9,  groups: [2, 3, 4],       example: '501234567' },
  { code: 'XX', dial: '',    name: 'Другая страна',  min: 6,  max: 15, groups: [3, 3, 3, 3, 3], example: '' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];
const OTHER = COUNTRIES[COUNTRIES.length - 1];
const byCode = (code: string) => COUNTRIES.find((c) => c.code === code)!;

/** Цифры номера, разбитые пробелами по группам страны. Лишние цифры не режем. */
export function formatNational(country: Country, digits: string): string {
  const parts: string[] = [];
  let i = 0;
  for (const g of country.groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + g));
    i += g;
  }
  if (i < digits.length) parts.push(digits.slice(i));
  return parts.join(' ');
}

/** Убрать 8 или 0 в начале, если без них номер как раз нужной длины (8 989…, 0 532…, 8 029…). */
function stripTrunk(country: Country, digits: string): string {
  let d = digits;
  for (let i = 0; i < 2 && d.length > country.max && /^[08]/.test(d); i++) d = d.slice(1);
  return d;
}

/** Страна по международному номеру (цифры без плюса). */
function detectCountry(digits: string, current: Country): Country {
  const matches = COUNTRIES.filter((c) => c.dial && digits.startsWith(c.dial));
  if (!matches.length) return OTHER;
  const longest = Math.max(...matches.map((c) => c.dial.length));
  const best = matches.filter((c) => c.dial.length === longest);
  // +7: у Казахстана номера начинаются с 6 или 7 (701…, 747…, 777…), у России — нет
  if (best[0].dial === '7') return /^[67]/.test(digits.slice(1)) ? byCode('KZ') : byCode('RU');
  return best.find((c) => c.code === current.code) || best[0];
}

/**
 * Разбор того, что человек ввёл или вставил: страна и национальный номер.
 * С плюсом (или 00) — номер международный, страну определяем по коду.
 * Пока код набран не до конца («+9», «+99»), поле держит набранное как есть.
 * Без плюса — номер выбранной страны; если он длиннее нужного и начинается
 * с её кода или с 8/0, лишнее в начале убираем.
 */
export function parsePhoneInput(
  current: Country,
  raw: string,
): { country: Country; digits: string; pending?: string } {
  const compact = raw.replace(/[\s()\-.]/g, '');
  let digits = raw.replace(/\D/g, '');

  if (compact.startsWith('+') || compact.startsWith('00')) {
    const lead = compact.startsWith('00') ? '00' : '+';
    if (lead === '00') digits = digits.slice(2);
    const full = COUNTRIES.some((c) => c.dial && digits.startsWith(c.dial));
    if (!full) {
      // Код ещё может стать одним из известных — ждём следующих цифр
      if (COUNTRIES.some((c) => c.dial && c.dial.startsWith(digits))) {
        return { country: current, digits: '', pending: lead + digits };
      }
      return { country: OTHER, digits };
    }
    const country = detectCountry(digits, current);
    return { country, digits: stripTrunk(country, digits.slice(country.dial.length)) };
  }

  if (current.code === 'XX') return { country: current, digits };
  if (digits.length > current.max && digits.startsWith(current.dial)) {
    digits = digits.slice(current.dial.length);
  }
  digits = stripTrunk(current, digits);
  // +7 общий у России и Казахстана: по полному номеру видно, чей он
  if (current.dial === '7' && digits.length >= current.min) {
    return { country: byCode(/^[67]/.test(digits) ? 'KZ' : 'RU'), digits };
  }
  return { country: current, digits };
}

/**
 * Название страны на языке интерфейса. Intl.DisplayNames знает названия
 * всех стран на всех языках, поэтому таблица переводов не нужна: русское
 * `name` в COUNTRIES остаётся только запасным вариантом для старых браузеров.
 */
function countryName(c: Country, locale: string): string {
  if (c.code === 'XX') {
    return locale === 'en' ? 'Other country' : locale === 'ka' ? 'სხვა ქვეყანა' : 'Другая страна';
  }
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(c.code) || c.name;
  } catch {
    return c.name;
  }
}

const TEXT = {
  ru: { after: 'цифр после', otherPh: 'Код страны и номер', otherHint: 'Например, 44 7400 123456', pick: 'Выбрать страну', ok: 'Номер введён полностью' },
  en: { after: 'digits after', otherPh: 'Country code and number', otherHint: 'For example, 44 7400 123456', pick: 'Choose country', ok: 'Number complete' },
  ka: { after: 'ციფრი, კოდის შემდეგ', otherPh: 'ქვეყნის კოდი და ნომერი', otherHint: 'მაგალითად, 44 7400 123456', pick: 'აირჩიეთ ქვეყანა', ok: 'ნომერი სრულია' },
} as const;

/** Вернёт E.164 или null, если номер не проходит проверку. */
export function buildPhone(country: Country, national: string): string | null {
  const digits = national.replace(/\D/g, '');
  if (digits.length < country.min || digits.length > country.max) return null;
  return country.code === 'XX' ? `+${digits}` : `+${country.dial}${digits}`;
}

function Flag({ country, className = '' }: { country: Country; className?: string }) {
  if (country.code === 'XX') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={'text-ink-500 ' + className}
           fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
      </svg>
    );
  }
  return (
    <img
      src={`/flags/${country.code.toLowerCase()}.webp`}
      alt=""
      width={22}
      height={16}
      loading="lazy"
      decoding="async"
      className={'w-[22px] h-[16px] rounded-[3px] object-cover ring-1 ring-black/10 shrink-0 ' + className}
    />
  );
}

export default function PhoneInput({
  country,
  onCountryChange,
  value,
  onChange,
  error,
  id = 'phone',
}: {
  country: Country;
  onCountryChange: (c: Country) => void;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  /** Не используется: подсказка в поле — пример номера выбранной страны. */
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const { language } = useLanguage();
  const T = TEXT[language as keyof typeof TEXT] || TEXT.ru;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Курсор после форматирования ставим за ту же по счёту цифру, что и до него,
  // иначе при правке в середине номера он прыгал бы в конец.
  useLayoutEffect(() => {
    const el = inputRef.current;
    const n = caretDigits.current;
    if (!el || n === null || document.activeElement !== el) return;
    caretDigits.current = null;
    let pos = 0;
    for (let seen = 0; pos < value.length && seen < n; pos++) if (/\d/.test(value[pos])) seen++;
    el.setSelectionRange(pos, pos);
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    const before = raw.slice(0, caret).replace(/\D/g, '').length;
    const total = raw.replace(/\D/g, '').length;

    const parsed = parsePhoneInput(country, raw);
    if (parsed.pending !== undefined) {
      caretDigits.current = null;
      onChange(parsed.pending);
      return;
    }
    if (parsed.country.code !== country.code) onCountryChange(parsed.country);
    // Срезанные спереди цифры (код страны, 8/0) сдвигают курсор
    const removed = Math.max(0, total - parsed.digits.length);
    caretDigits.current = Math.max(0, before - removed);
    onChange(formatNational(parsed.country, parsed.digits));
  };

  const pick = (c: Country) => {
    setOpen(false);
    onCountryChange(c);
    const digits = value.replace(/\D/g, '');
    onChange(formatNational(c, c.code === 'XX' ? digits : stripTrunk(c, digits)));
    inputRef.current?.focus();
  };

  const complete = buildPhone(country, value) !== null;
  const placeholder = country.code === 'XX' ? T.otherPh : formatNational(country, country.example);
  const hint = useMemo(() => {
    if (country.code === 'XX') return T.otherHint;
    const n = country.min === country.max ? `${country.min}` : `${country.min}–${country.max}`;
    return `${n} ${T.after} +${country.dial}`;
  }, [country, T]);

  return (
    <div ref={boxRef} className="relative">
      <div
        className={
          'flex items-center bg-ink-100 border rounded-lg transition-all duration-200 ' +
          (error
            ? 'border-clay ring-1 ring-clay/40'
            : 'border-ink-300 focus-within:ring-2 focus-within:ring-brand-500')
        }
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 pl-3 pr-2.5 py-3 shrink-0 rounded-l-lg
                     border-r border-ink-300 hover:bg-ink-200 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={`${country.dial ? `+${country.dial}` : '+'} ${countryName(country, language)}. ${T.pick}`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Flag country={country} />
          <span className="text-ink-900 font-semibold tabular-nums">
            {country.dial ? `+${country.dial}` : '+'}
          </span>
          <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"
               className={'text-ink-500 transition-transform ' + (open ? 'rotate-180' : '')} fill="currentColor">
            <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          id={id}
          value={value}
          onChange={handleInput}
          className="flex-1 min-w-0 bg-transparent px-3 py-3 text-ink-900 text-base tracking-wide tabular-nums
                     placeholder:text-ink-400 placeholder:tracking-normal focus:outline-none"
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-hint`}
        />

        {complete && !error && (
          <svg viewBox="0 0 20 20" width="18" height="18" className="mr-3 text-brand-600 shrink-0"
               role="img" aria-label={T.ok}>
            <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <p id={`${id}-hint`} className={'mt-1.5 text-xs ' + (error ? 'text-clay font-medium' : 'text-ink-500')}>
        {error || hint}
      </p>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg py-1
                     bg-surface border border-ink-200 shadow-cardHover"
        >
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              role="option"
              aria-selected={c.code === country.code}
              onClick={() => pick(c)}
              className={
                'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm ' +
                'hover:bg-cream-200 focus-visible:bg-cream-200 focus-visible:outline-none transition-colors ' +
                (c.code === country.code ? 'bg-brand-50 font-semibold' : '')
              }
            >
              <Flag country={c} />
              <span className="flex-grow text-ink-900">{countryName(c, language)}</span>
              {c.dial && <span className="text-ink-500 tabular-nums">+{c.dial}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
