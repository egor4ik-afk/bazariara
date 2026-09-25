/**
 * Перевод из админки: режет длинный текст на куски и переводит по очереди.
 *
 * Почему не одним запросом. Статья блога легко набирает 10–15 тысяч
 * символов, а грузинский в токенах в 3–4 раза длиннее русского. Одним
 * запросом ответ либо не уложится в лимит модели и оборвётся на середине,
 * либо не уложится во время функции Vercel. Куски по абзацам — надёжно,
 * и видно прогресс.
 *
 * Строки с картинками и видео в переводчик не отправляются вовсе: переводить
 * там нечего, а модель могла бы «поправить» URL.
 */

export type Lang = 'en' | 'ka';
export type Kind = 'title' | 'plain' | 'markdown' | 'seo_title' | 'seo_description';

const CHUNK = 1800;

/** Блок, который не нужно переводить: картинка или видео целой строкой. */
function isMediaBlock(block: string): boolean {
  const b = block.trim();
  return /^!\[[^\]]*\]\([^)\s]+\)$/.test(b) || /^@video\[[^\]]+\]$/.test(b) ||
         /^https?:\/\/\S+$/.test(b);
}

async function translateOne(text: string, to: Lang, kind: Kind): Promise<string> {
  const res = await fetch('/api/admin/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, to, kind }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d.text as string;
}

/**
 * Переводит текст любой длины. Короткий — одним запросом; длинный режет
 * по пустым строкам и склеивает обратно тем же разделителем, так что
 * абзацы и структура Markdown сохраняются.
 */
export async function translateText(
  text: string,
  to: Lang,
  kind: Kind,
  onStep?: (done: number, total: number) => void,
): Promise<string> {
  const src = (text || '').trim();
  if (!src) return '';
  if (src.length <= CHUNK && !isMediaBlock(src)) {
    onStep?.(1, 1);
    return translateOne(src, to, kind);
  }

  const blocks = src.split(/\n{2,}/);

  // Собираем соседние текстовые блоки в куски до CHUNK символов.
  // Медиа-блок разрывает кусок и проходит как есть.
  type Part = { text: string; translate: boolean };
  const parts: Part[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) { parts.push({ text: buf.join('\n\n'), translate: true }); buf = []; } };

  for (const b of blocks) {
    if (isMediaBlock(b)) { flush(); parts.push({ text: b, translate: false }); continue; }
    if (buf.join('\n\n').length + b.length + 2 > CHUNK) flush();
    buf.push(b);
  }
  flush();

  const total = parts.filter((p) => p.translate).length;
  let done = 0;
  const out: string[] = [];
  for (const p of parts) {
    if (!p.translate) { out.push(p.text); continue; }
    out.push(await translateOne(p.text, to, kind));
    onStep?.(++done, total);
  }
  return out.join('\n\n');
}

export type FieldSpec = { from: string; kind: Kind; label: string };

/**
 * Переводит набор полей в один или несколько языков. Возвращает объект
 * вида { title_en: …, body_ka: … }, который остаётся слить в форму.
 *
 * Пустые поля источника пропускаются. Поля, где перевод уже есть,
 * переводятся только при overwrite — чтобы кнопка не затёрла ручную правку.
 */
export async function translateFields(
  source: Record<string, any>,
  fields: FieldSpec[],
  langs: Lang[],
  opts: { overwrite: boolean; onProgress?: (msg: string) => void },
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const lang of langs) {
    for (const f of fields) {
      const value = String(source[f.from] || '').trim();
      const target = `${f.from}_${lang}`;
      if (!value) continue;
      if (!opts.overwrite && String(source[target] || '').trim()) continue;

      opts.onProgress?.(`${lang.toUpperCase()} · ${f.label}…`);
      result[target] = await translateText(value, lang, f.kind, (d, t) => {
        if (t > 1) opts.onProgress?.(`${lang.toUpperCase()} · ${f.label} ${d}/${t}`);
      });
    }
  }
  return result;
}
