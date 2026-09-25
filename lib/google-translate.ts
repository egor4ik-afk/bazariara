/**
 * Google Translate — основной переводчик проекта.
 *
 * Бесплатный эндпоинт translate.googleapis.com (client=gtx), тот же, что
 * раньше был в batch-translate. Отвечает за секунду — в отличие от AI,
 * который на длинной статье упирался в лимит времени функции (HTTP 504).
 *
 * Два отличия от прежней версии:
 *
 * 1. Ошибка — это ошибка. Старый код при сбое молча возвращал ИСХОДНЫЙ
 *    русский текст, и он сохранялся в базу как «перевод». В таблице
 *    лежал русский текст в колонке name_en, и узнать об этом было нельзя.
 *
 * 2. POST вместо GET. Текст в URL упирался в длину адреса, и длинные
 *    описания обрезались.
 */

export type Lang = 'en' | 'ka';

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const MAX_CHUNK = 4500;

async function translateChunk(text: string, to: Lang): Promise<string> {
  const url = `${ENDPOINT}?client=gtx&sl=ru&tl=${to}&dt=t`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ q: text }).toString(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google Translate ответил ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data?.[0])) throw new Error('Google Translate вернул неожиданный ответ');
  return data[0].map((seg: any) => seg?.[0] ?? '').join('');
}

/** Строка, которую переводить не нужно: картинка, видео, голая ссылка. */
function isMediaBlock(block: string): boolean {
  const b = block.trim();
  return /^!\[[^\]]*\]\([^)\s]+\)$/.test(b) || /^@video\[[^\]]+\]$/.test(b) ||
         /^https?:\/\/\S+$/.test(b);
}

/**
 * Google иногда «разбирает» разметку Markdown: ставит пробелы внутри
 * **жирного**, отрывает скобку ссылки от текста. Возвращаем как было.
 */
export function repairMarkdown(s: string): string {
  return s
    .replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**')
    .replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**')
    .replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**')
    .replace(/\]\s+\(/g, '](')
    .replace(/!\s+\[/g, '![')
    .replace(/^(#{1,6})([^#\s])/gm, '$1 $2')
    .replace(/^([-*])([^\s*-])/gm, '$1 $2');
}

/**
 * Переводит текст любой длины: режет по пустым строкам на куски до 4500
 * символов, медиа-строки пропускает без перевода, склеивает обратно.
 */
export async function googleTranslate(text: string, to: Lang, markdown = false): Promise<string> {
  const src = (text || '').trim();
  if (!src) return '';

  const blocks = src.split(/\n{2,}/);
  const parts: { text: string; translate: boolean }[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) { parts.push({ text: buf.join('\n\n'), translate: true }); buf = []; } };

  for (const b of blocks) {
    if (isMediaBlock(b)) { flush(); parts.push({ text: b, translate: false }); continue; }
    if (buf.join('\n\n').length + b.length + 2 > MAX_CHUNK) flush();
    buf.push(b);
  }
  flush();

  const out: string[] = [];
  for (const p of parts) {
    out.push(p.translate ? await translateChunk(p.text, to) : p.text);
  }
  const joined = out.join('\n\n');
  return markdown ? repairMarkdown(joined) : joined;
}

/** Перевод сразу на оба языка. */
export async function googleTranslateBoth(text: string, markdown = false) {
  const [en, ka] = await Promise.all([
    googleTranslate(text, 'en', markdown),
    googleTranslate(text, 'ka', markdown),
  ]);
  return { en, ka };
}
