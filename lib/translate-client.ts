/**
 * Перевод из админки.
 *
 *   google — черновик перевода. Одно поле = один запрос: нарезку длинного
 *            текста делает сервер. Около секунды на поле.
 *   review — AI вычитывает УЖЕ готовый перевод. Текст режется на куски,
 *            к каждому прикладывается соответствующий кусок оригинала,
 *            чтобы запрос укладывался во время функции.
 */

export type Lang = 'en' | 'ka';
export type Kind = 'title' | 'plain' | 'markdown' | 'seo_title' | 'seo_description';
export type Engine = 'google' | 'review';

const REVIEW_CHUNK = 2500;

async function call(body: Record<string, unknown>): Promise<string> {
  const res = await fetch('/api/admin/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d.text as string;
}

function isMediaBlock(b: string): boolean {
  const t = b.trim();
  return /^!\[[^\]]*\]\([^)\s]+\)$/.test(t) || /^@video\[[^\]]+\]$/.test(t) || /^https?:\/\/\S+$/.test(t);
}

/** Группирует абзацы в куски до `limit` символов, сохраняя индексы абзацев. */
function groupBlocks(blocks: string[], limit: number): number[][] {
  const groups: number[][] = [];
  let cur: number[] = [];
  let len = 0;
  blocks.forEach((b, i) => {
    if (cur.length && len + b.length > limit) { groups.push(cur); cur = []; len = 0; }
    cur.push(i);
    len += b.length + 2;
  });
  if (cur.length) groups.push(cur);
  return groups;
}

/** AI-вычитка длинного перевода по кускам, с оригиналом в контексте. */
async function reviewLong(
  translated: string, source: string, to: Lang, kind: Kind,
  onStep?: (d: number, t: number) => void,
): Promise<string> {
  const tBlocks = translated.split(/\n{2,}/);
  const sBlocks = source.split(/\n{2,}/);
  // Google сохраняет абзацы, поэтому обычно число блоков совпадает и
  // кусок перевода получает ровно свой кусок оригинала. Если нет —
  // даём оригинал целиком, обрезанный до разумной длины.
  const aligned = tBlocks.length === sBlocks.length;

  const groups = groupBlocks(tBlocks, REVIEW_CHUNK);
  const out: string[] = [];
  let done = 0;
  for (const g of groups) {
    const piece = g.map((i) => tBlocks[i]).join('\n\n');
    if (g.every((i) => isMediaBlock(tBlocks[i]))) { out.push(piece); onStep?.(++done, groups.length); continue; }
    const src = aligned ? g.map((i) => sBlocks[i]).join('\n\n') : source.slice(0, 3000);
    out.push(await call({ text: piece, to, kind, engine: 'review', source: src }));
    onStep?.(++done, groups.length);
  }
  return out.join('\n\n');
}

export type FieldSpec = { from: string; kind: Kind; label: string };

/**
 * google: переводит поля с русского. Непустые переводы трогает только
 *         при overwrite, чтобы не затереть ручную правку.
 * review: вычитывает то, что уже переведено. Пустые поля пропускает.
 */
export async function translateFields(
  source: Record<string, any>,
  fields: FieldSpec[],
  langs: Lang[],
  opts: { engine: Engine; overwrite?: boolean; onProgress?: (msg: string) => void },
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const lang of langs) {
    for (const f of fields) {
      const ru = String(source[f.from] || '').trim();
      const target = `${f.from}_${lang}`;
      const existing = String(source[target] || '').trim();
      if (!ru) continue;

      if (opts.engine === 'google') {
        if (existing && !opts.overwrite) continue;
        opts.onProgress?.(`${lang.toUpperCase()} · ${f.label}…`);
        result[target] = await call({ text: ru, to: lang, kind: f.kind, engine: 'google' });
      } else {
        if (!existing) continue;
        opts.onProgress?.(`AI · ${lang.toUpperCase()} · ${f.label}…`);
        result[target] = existing.length > REVIEW_CHUNK
          ? await reviewLong(existing, ru, lang, f.kind, (d, t) =>
              opts.onProgress?.(`AI · ${lang.toUpperCase()} · ${f.label} ${d}/${t}`))
          : await call({ text: existing, to: lang, kind: f.kind, engine: 'review', source: ru });
      }
    }
  }
  return result;
}
