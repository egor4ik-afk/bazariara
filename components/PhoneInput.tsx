'use client';

import { useMemo, useState, useRef, useEffect } from 'react';

/**
 * Ввод телефона с выбором страны.
 *
 * Было: жёстко пришитый префикс `+995` и `maxLength={9}` — заказ мог оформить
 * только человек с грузинским номером. Туристы, а это заметная часть
 * аудитории магазина сувениров, вводили свой номер как придётся, и он попадал
 * в базу как `+995` плюс обрубок иностранного номера.
 *
 * Стало: страна выбирается, Грузия стоит по умолчанию. Валидация — по длине
 * национального номера для конкретной страны, а не одна общая маска.
 *
 * Библиотеку (libphonenumber-js весит ~145 КБ) намеренно не тащим: для
 * проверки «номер вообще похож на настоящий» хватает диапазона длин,
 * а ловить неверные номера всё равно придётся звонком.
 */

export type Country = {
  code: string;      // ISO 3166-1 alpha-2
  dial: string;      // без плюса
  flag: string;
  name: string;
  min: number;       // минимум цифр национального номера
  max: number;
};

/**
 * Грузия первая, дальше — страны, откуда чаще всего едут в Тбилиси,
 * потом остальные по алфавиту. Список не полный намеренно: 200 строк
 * в выпадашке никто не листает, а «другая страна» закрывает хвост.
 */
export const COUNTRIES: Country[] = [
  { code: 'GE', dial: '995', flag: '🇬🇪', name: 'Грузия',        min: 9,  max: 9  },
  { code: 'RU', dial: '7',   flag: '🇷🇺', name: 'Россия',        min: 10, max: 10 },
  { code: 'AM', dial: '374', flag: '🇦🇲', name: 'Армения',       min: 8,  max: 8  },
  { code: 'AZ', dial: '994', flag: '🇦🇿', name: 'Азербайджан',   min: 9,  max: 9  },
  { code: 'TR', dial: '90',  flag: '🇹🇷', name: 'Турция',        min: 10, max: 10 },
  { code: 'UA', dial: '380', flag: '🇺🇦', name: 'Украина',       min: 9,  max: 9  },
  { code: 'BY', dial: '375', flag: '🇧🇾', name: 'Беларусь',      min: 9,  max: 9  },
  { code: 'KZ', dial: '7',   flag: '🇰🇿', name: 'Казахстан',     min: 10, max: 10 },
  { code: 'IL', dial: '972', flag: '🇮🇱', name: 'Израиль',       min: 8,  max: 9  },
  { code: 'DE', dial: '49',  flag: '🇩🇪', name: 'Германия',      min: 10, max: 11 },
  { code: 'PL', dial: '48',  flag: '🇵🇱', name: 'Польша',        min: 9,  max: 9  },
  { code: 'GB', dial: '44',  flag: '🇬🇧', name: 'Великобритания',min: 10, max: 10 },
  { code: 'US', dial: '1',   flag: '🇺🇸', name: 'США',           min: 10, max: 10 },
  { code: 'FR', dial: '33',  flag: '🇫🇷', name: 'Франция',       min: 9,  max: 9  },
  { code: 'IT', dial: '39',  flag: '🇮🇹', name: 'Италия',        min: 9,  max: 10 },
  { code: 'ES', dial: '34',  flag: '🇪🇸', name: 'Испания',       min: 9,  max: 9  },
  { code: 'AE', dial: '971', flag: '🇦🇪', name: 'ОАЭ',           min: 9,  max: 9  },
  { code: 'XX', dial: '',    flag: '🌍', name: 'Другая страна',  min: 6,  max: 15 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

/** Вернёт E.164 или null, если номер не проходит проверку. */
export function buildPhone(country: Country, national: string): string | null {
  const digits = national.replace(/\D/g, '');

  if (country.code === 'XX') {
    // «Другая страна» — человек вводит номер целиком с кодом страны.
    if (digits.length < country.min || digits.length > country.max) return null;
    return `+${digits}`;
  }

  if (digits.length < country.min || digits.length > country.max) return null;
  return `+${country.dial}${digits}`;
}

export default function PhoneInput({
  country,
  onCountryChange,
  value,
  onChange,
  error,
  placeholder,
  id = 'phone',
}: {
  country: Country;
  onCountryChange: (c: Country) => void;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const hint = useMemo(() => {
    if (country.code === 'XX') return 'Введите номер с кодом страны';
    return country.min === country.max
      ? `${country.min} цифр`
      : `${country.min}–${country.max} цифр`;
  }, [country]);

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
          className="flex items-center gap-1.5 pl-3 pr-2 py-3 shrink-0 hover:bg-ink-200
                     rounded-l-lg transition-colors"
          aria-label="Выбрать страну"
        >
          <span className="text-lg leading-none" aria-hidden="true">{country.flag}</span>
          <span className="text-ink-900 font-medium text-sm">
            {country.dial ? `+${country.dial}` : '+'}
          </span>
          <span className="text-ink-500 text-[10px]" aria-hidden="true">▼</span>
        </button>

        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d\s()-]/g, ''))}
          className="flex-1 min-w-0 bg-transparent px-3 py-3 text-ink-900
                     placeholder-ink-400 focus:outline-none"
          placeholder={placeholder}
          maxLength={country.max + 5}
        />
      </div>

      <p className={'mt-1.5 text-xs ' + (error ? 'text-clay font-medium' : 'text-ink-500')}>
        {error || hint}
      </p>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg
                        bg-surface border border-ink-200 shadow-cardHover">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onCountryChange(c); setOpen(false); }}
              className={
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm ' +
                'hover:bg-cream-200 transition-colors ' +
                (c.code === country.code ? 'bg-brand-50 font-semibold' : '')
              }
            >
              <span className="text-lg leading-none" aria-hidden="true">{c.flag}</span>
              <span className="flex-grow text-ink-900">{c.name}</span>
              {c.dial && <span className="text-ink-500">+{c.dial}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
