'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { translateFields, type FieldSpec } from '@/lib/translate-client';

type Post = {
  id: number; slug: string; title: string; excerpt: string | null;
  body: string; cover_url: string | null; status: string;
  seo_title: string | null; seo_description: string | null;
  author_name: string; published_at: string | null; updated_at: string;
  title_en?: string | null; title_ka?: string | null;
  excerpt_en?: string | null; excerpt_ka?: string | null;
  body_en?: string | null; body_ka?: string | null;
  seo_title_en?: string | null; seo_title_ka?: string | null;
  seo_description_en?: string | null; seo_description_ka?: string | null;
};

type Links = { regions: number[]; producers: number[]; products: number[]; tags: number[] };

const box = { background: 'rgb(var(--cream-200))', border: '1px solid rgb(var(--ink-200))', borderRadius: 8, color: 'rgb(var(--ink-900))', padding: '9px 12px', fontSize: 13, outline: 'none', width: '100%' } as const;
/** Что переводится в статье и как. Обложка, slug и связи — общие, не переводятся. */
const BLOG_FIELDS: FieldSpec[] = [
  { from: 'title',           kind: 'title',           label: 'заголовок' },
  { from: 'excerpt',         kind: 'plain',           label: 'краткое описание' },
  { from: 'body',            kind: 'markdown',        label: 'текст' },
  { from: 'seo_title',       kind: 'seo_title',       label: 'SEO Title' },
  { from: 'seo_description', kind: 'seo_description', label: 'SEO Description' },
];

const aiBtn = {
  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  border: '1px solid rgb(var(--brand-300))', background: 'rgb(var(--brand-50))',
  color: 'rgb(var(--brand-700))', whiteSpace: 'nowrap',
} as const;

const toolBtn = { padding: '5px 10px', borderRadius: 6, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--ink-700))', fontSize: 12, cursor: 'pointer' } as const;

const card = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))', borderRadius: 12, padding: 16 } as const;

const EMPTY: Partial<Post> = { status: 'draft', author_name: 'BAZARI ARA', body: '' };
const EMPTY_LINKS: Links = { regions: [], producers: [], products: [], tags: [] };

export default function BlogAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refs, setRefs] = useState<{ regions: any[]; producers: any[]; tags: any[] }>({ regions: [], producers: [], tags: [] });
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [links, setLinks] = useState<Links>(EMPTY_LINKS);
  const [msg, setMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<'ru' | 'en' | 'ka'>('ru');
  const [translating, setTranslating] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      fetch('/api/admin/blog').then((x) => x.json()),
      fetch('/api/admin/blog?refs=1').then((x) => x.json()),
    ]);
    setPosts(p.posts || []);
    if (r.regions) setRefs({ regions: r.regions, producers: r.producers || [], tags: r.tags || [] });
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (id: number) => {
    const d = await fetch(`/api/admin/blog?id=${id}`).then((x) => x.json());
    if (d.post) { setEditing(d.post); setLinks({ ...EMPTY_LINKS, ...d.links }); }
  };

  const save = async () => {
    if (!editing) return;
    const res = await fetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editing, links }),
    });
    const d = await res.json();
    setMsg(res.ok ? 'Сохранено' : `Ошибка: ${d.error}`);
    if (res.ok) { setEditing(null); setLinks(EMPTY_LINKS); load(); }
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить статью? Отменить будет нельзя.')) return;
    await fetch(`/api/admin/blog?id=${id}`, { method: 'DELETE' });
    load();
  };

  const set = (k: keyof Post) => (e: any) => setEditing({ ...editing!, [k]: e.target.value });

  /** Вставляет текст в позицию курсора, а не в конец — иначе картинка
   *  всегда улетала бы в самый низ статьи. */
  const insertAtCursor = (snippet: string) => {
    const el = bodyRef.current;
    const key = field('body');
    const current = String(editing?.[key] || '');
    if (!el) {
      setEditing({ ...editing!, [key]: current + '\n\n' + snippet });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? start;
    const next = current.slice(0, start) + snippet + current.slice(end);
    setEditing({ ...editing!, [key]: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  /** Загрузка в тот же бакет, что и фото товаров: роут сам конвертирует
   *  HEIC, применяет EXIF-поворот и жмёт до 2000px. */
  const uploadFile = async (file: File, asCover = false) => {
    if (!file.type.startsWith('image/')) {
      setMsg('Видео заливать в бакет не нужно — вставьте ссылку на YouTube кнопкой «Видео».');
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Ошибка загрузки');

      if (asCover) setEditing((p) => ({ ...p!, cover_url: data.url }));
      else insertAtCursor(`\n\n![${file.name.replace(/\.[^.]+$/, '')}](${data.url})\n\n`);

      setMsg('Загружено');
    } catch (e: any) {
      setMsg(`Ошибка: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  /** Скриншоты приходят из буфера обмена, а не файлом — самый частый путь. */
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    e.preventDefault();
    uploadFile(new File([file], `screenshot-${Date.now()}.png`, { type: file.type }));
  };

  const onDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    e.preventDefault();
    uploadFile(file);
  };

  const insertVideoLink = () => {
    const url = prompt('Ссылка на YouTube или Vimeo:');
    if (!url) return;
    insertAtCursor(`\n\n@video[${url.trim()}]\n\n`);
  };

  /**
   * Загрузка видео прямо в бакет, мимо Vercel.
   *
   * Через обычный роут ролик не пройдёт: у serverless-функции лимит тела
   * 4.5 МБ. Здесь функция отдаёт только подпись (сотни байт), а сам файл
   * браузер кладёт в Yandex Object Storage сам — размер перестаёт мешать.
   */
  const uploadVideo = async (file: File) => {
    setUploading(true);
    setMsg(null);
    try {
      const signRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, size: file.size }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || 'Не удалось получить ссылку');

      const put = await fetch(sign.uploadUrl, {
        method: 'PUT',
        // ACL зашит в подписанную ссылку; неподписанный x-amz-acl хранилище вправе отвергнуть
        headers: { 'Content-Type': sign.contentType },
        body: file,
      });
      if (!put.ok) throw new Error(`Бакет ответил ${put.status}`);

      insertAtCursor(`\n\n@video[${sign.publicUrl}]\n\n`);
      setMsg('Видео загружено');
    } catch (e: any) {
      setMsg(`Ошибка: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const toggle = (kind: keyof Links, id: number) =>
    setLinks((p) => ({
      ...p,
      [kind]: p[kind].includes(id) ? p[kind].filter((x) => x !== id) : [...p[kind], id],
    }));

  // slug из заголовка: ручной ввод оставлен, но по умолчанию генерируем,
  // иначе половина статей уедет в прод с адресом вида /blog/undefined.
  const autoSlug = () => {
    const M: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    const src = String(editing?.title || '').toLowerCase();
    const slug = src.split('').map((c) => M[c] ?? c).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
    setEditing({ ...editing!, slug });
  };

  /**
   * Автоперевод RU → EN и KA. Если перевод уже есть хотя бы в одном поле,
   * спрашиваем, перезаписывать ли: иначе кнопка затёрла бы ручную правку.
   * Ничего не сохраняет сам — результат попадает в форму, дальше человек
   * проверяет и жмёт «Сохранить».
   */
  const autoTranslate = async (langs: ('en' | 'ka')[], engine: 'google' | 'review' = 'google') => {
    if (!editing) return;
    if (!String(editing.title || '').trim()) { setMsg('Сначала заполните русский заголовок'); return; }

    const hasExisting = langs.some((l) =>
      BLOG_FIELDS.some((f) => String((editing as any)[`${f.from}_${l}`] || '').trim()));
    // Вычитка работает по уже готовому переводу — спрашивать про
    // перезапись незачем, она и есть правка.
    const overwrite = engine === 'google' && hasExisting
      ? confirm('Часть перевода уже заполнена. Перезаписать её?\n\nОК — перевести всё заново\nОтмена — перевести только пустые поля')
      : false;

    setMsg(null);
    setTranslating('Начинаем…');
    try {
      const out = await translateFields(editing, BLOG_FIELDS, langs, {
        engine,
        overwrite,
        onProgress: (m) => setTranslating(m),
      });
      setEditing((prev) => ({ ...prev!, ...out }));
      const n = Object.keys(out).length;
      setMsg(n ? `Переведено полей: ${n}. Проверьте текст и сохраните.` : 'Нечего переводить — всё уже заполнено.');
    } catch (e: any) {
      setMsg(`Перевод прервался: ${e.message}. Переведённое до ошибки уже в форме.`);
    } finally {
      setTranslating(null);
    }
  };

  const suffix = lang === 'ru' ? '' : `_${lang}`;
  const field = (base: 'title' | 'excerpt' | 'body' | 'seo_title' | 'seo_description') => (base + suffix) as keyof Post;

  return (
    <div style={{ padding: 24, color: 'rgb(var(--ink-900))', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Блог — путеводитель по Грузии</h1>
        {!editing && (
          <button
            onClick={() => { setEditing({ ...EMPTY }); setLinks(EMPTY_LINKS); }}
            style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgb(var(--brand-600))', color: 'rgb(var(--on-brand))', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            + Новая статья
          </button>
        )}
      </div>

      {msg && <p style={{ color: 'rgb(var(--brand-600))', fontSize: 13, marginBottom: 12 }}>{msg}</p>}

      {editing ? (
        <div style={{ ...card }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center' }}>
            {(['ru', 'en', 'ka'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                         border: '1px solid rgb(var(--ink-200))', background: lang === l ? 'rgb(var(--brand-600))' : 'transparent',
                         color: lang === l ? 'rgb(var(--on-brand))' : 'rgb(var(--ink-700))' }}>
                {l.toUpperCase()}{l !== 'ru' && editing[`title_${l}` as keyof Post] ? ' ✓' : ''}
              </button>
            ))}
            <span style={{ fontSize: 11, color: 'rgb(var(--ink-500))', alignSelf: 'center', marginLeft: 6 }}>
              {lang === 'ru' ? 'основной язык' : 'перевод, можно оставить пустым'}
            </span>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              {translating ? (
                <span style={{ fontSize: 12, color: 'rgb(var(--brand-600))', fontWeight: 600 }}>
                  🌐 {translating}
                </span>
              ) : (
                <>
                  {/* Google — быстрый черновик, AI — вычитка готового перевода */}
                  <button
                    onClick={() => autoTranslate(lang === 'ru' ? ['en', 'ka'] : [lang as 'en' | 'ka'], 'google')}
                    style={aiBtn}
                    title="Google Translate: быстро, около секунды на поле"
                  >
                    🌐 {lang === 'ru' ? 'Перевести на EN и KA' : `Перевести на ${lang.toUpperCase()}`}
                  </button>
                  <button
                    onClick={() => autoTranslate(lang === 'ru' ? ['en', 'ka'] : [lang as 'en' | 'ka'], 'review')}
                    style={{ ...aiBtn, background: 'transparent' }}
                    title="AI вычитывает уже готовый перевод и правит ошибки"
                  >
                    ✨ Проверить AI
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <Field label={`Заголовок (${lang.toUpperCase()})`}>
              <input style={box} value={(editing[field('title')] as string) || ''} onChange={set(field('title'))} />
            </Field>

            {lang === 'ru' && (
              <Field label="Адрес статьи (slug)">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={box} value={editing.slug || ''} onChange={set('slug')} placeholder="chto-privezti-iz-gruzii" />
                  <button onClick={autoSlug} style={{ padding: '0 14px', borderRadius: 8, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--ink-600))', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Из заголовка
                  </button>
                </div>
              </Field>
            )}

            <Field label={`Краткое описание (${lang.toUpperCase()}) — показывается в списке и в поиске`}>
              <textarea style={{ ...box, minHeight: 60, fontFamily: 'inherit' }}
                value={(editing[field('excerpt')] as string) || ''} onChange={set(field('excerpt'))} />
            </Field>

            <Field label={`Текст (${lang.toUpperCase()}) — Markdown: ## заголовок, **жирный**, - список, [ссылка](url)`}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={toolBtn}>🖼 Изображение</button>
                <button onClick={insertVideoLink} style={toolBtn}>▶ Видео</button>
                <button onClick={() => insertAtCursor('\n\n## ')} style={toolBtn}>H2</button>
                <button onClick={() => insertAtCursor('**жирный**')} style={toolBtn}>B</button>
                <button onClick={() => insertAtCursor('\n- ')} style={toolBtn}>Список</button>
                <button onClick={() => insertAtCursor('[текст](https://)')} style={toolBtn}>Ссылка</button>
                <span style={{ fontSize: 11, color: uploading ? 'rgb(var(--brand-600))' : 'rgb(var(--ink-500))' }}>
                  {uploading ? 'Загружаю…' : 'Скриншот можно вставить прямо в текст: Ctrl+V'}
                </span>
              </div>

              <input ref={fileRef} type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />

              <textarea
                ref={bodyRef}
                onPaste={onPaste}
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{ ...box, minHeight: 320, fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.6 }}
                value={(editing[field('body')] as string) || ''} onChange={set(field('body'))} />
            </Field>

            {/* SEO — отдельно для каждого языка. Раньше поля были только
                русские и жили в блоке, который прятался на EN и KA, —
                поэтому казалось, что язык внизу не переключается. */}
            <Field label={`SEO Title (${lang.toUpperCase()}) — если пусто, берётся заголовок`}>
              <input style={box} value={(editing[field('seo_title')] as string) || ''} onChange={set(field('seo_title'))} />
              <SeoCounter value={(editing[field('seo_title')] as string) || (editing[field('title')] as string) || ''} max={47} />
            </Field>
            <Field label={`SEO Description (${lang.toUpperCase()})`}>
              <textarea style={{ ...box, minHeight: 50, fontFamily: 'inherit' }}
                value={(editing[field('seo_description')] as string) || ''} onChange={set(field('seo_description'))} />
              <SeoCounter value={(editing[field('seo_description')] as string) || ''} min={120} max={160} />
            </Field>

            {/* Общее для всех языков — видно всегда. Раньше блок был обёрнут
                в lang === 'ru' и исчезал на EN/KA вместе с обложкой и статусом. */}
            <div style={{ marginTop: 6, paddingTop: 14, borderTop: '1px dashed rgb(var(--ink-200))' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                          color: 'rgb(var(--ink-500))', marginBottom: 10 }}>
                Общее для всех языков
              </p>
            </div>
            {(
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                  <Field label="Обложка">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input style={box} value={editing.cover_url || ''} onChange={set('cover_url')} placeholder="URL или загрузите файл" />
                      <label style={{ ...toolBtn, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                        Файл
                        <input type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, true); e.target.value = ''; }} />
                      </label>
                    </div>
                  </Field>
                  <Field label="Статус">
                    <select style={box} value={editing.status || 'draft'} onChange={set('status')}>
                      <option value="draft">Черновик</option>
                      <option value="published">Опубликована</option>
                      <option value="hidden">Скрыта</option>
                    </select>
                  </Field>
                  <Field label="Автор">
                    <input style={box} value={editing.author_name || ''} onChange={set('author_name')} />
                  </Field>
                </div>


                <Picker title="Регионы" items={refs.regions} selected={links.regions} onToggle={(id) => toggle('regions', id)} />
                <Picker title="Производители" items={refs.producers} selected={links.producers} onToggle={(id) => toggle('producers', id)} />
                <Picker title="Рубрики" items={refs.tags} selected={links.tags} onToggle={(id) => toggle('tags', id)} />
                <p style={{ fontSize: 11, color: 'rgb(var(--ink-500))' }}>
                  Связи работают в обе стороны: статья покажет блоки с регионом и производителем,
                  а на их страницах появится ссылка на статью.
                </p>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={Boolean(translating)} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'rgb(var(--brand-600))', color: 'rgb(var(--on-brand))', fontWeight: 700, cursor: 'pointer' }}>
              Сохранить
            </button>
            <button onClick={() => { setEditing(null); setLinks(EMPTY_LINKS); }}
              style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--ink-600))', cursor: 'pointer' }}>
              Отмена
            </button>
            {editing.slug && editing.status === 'published' && (
              <a href={`/ru/blog/${editing.slug}`} target="_blank" rel="noreferrer"
                 style={{ alignSelf: 'center', marginLeft: 'auto', color: 'rgb(var(--brand-600))', fontSize: 12 }}>
                Открыть на сайте →
              </a>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {posts.length === 0 && <p style={{ color: 'rgb(var(--ink-500))', fontSize: 13 }}>Статей пока нет.</p>}
          {posts.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>
                  {p.title}
                  <span style={{
                    marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 99,
                    background: p.status === 'published' ? 'rgb(var(--brand-600))' : 'rgb(var(--ink-200))',
                    color: p.status === 'published' ? 'rgb(var(--ink-900))' : 'rgb(var(--ink-500))',
                  }}>
                    {p.status === 'published' ? 'опубликована' : p.status === 'draft' ? 'черновик' : 'скрыта'}
                  </span>
                </p>
                <p style={{ fontSize: 12, color: 'rgb(var(--ink-500))' }}>
                  /blog/{p.slug} · {new Date(p.updated_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <button onClick={() => open(p.id)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--ink-900))', fontSize: 12, cursor: 'pointer' }}>
                Править
              </button>
              <button onClick={() => remove(p.id)}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--clay))', fontSize: 12, cursor: 'pointer' }}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Подсказка по длине: Title с учётом « | BAZARI ARA» (13 символов)
 *  укладывается в 60, Description — 120–160. */
function SeoCounter({ value, min = 0, max }: { value: string; min?: number; max: number }) {
  const n = value.trim().length;
  const bad = n > max || (min > 0 && n > 0 && n < min);
  return (
    <p style={{ fontSize: 11, marginTop: 4, color: bad ? 'rgb(var(--clay))' : 'rgb(var(--ink-500))' }}>
      {n} / {min ? `${min}–` : 'до '}{max}
      {n > max ? ' — обрежется в выдаче' : bad ? ' — коротковато' : ''}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'rgb(var(--ink-500))', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function Picker({ title, items, selected, onToggle }: {
  title: string; items: any[]; selected: number[]; onToggle: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: 'rgb(var(--ink-500))', marginBottom: 6 }}>{title}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((it) => {
          const on = selected.includes(it.id);
          return (
            <button key={it.id} onClick={() => onToggle(it.id)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                border: '1px solid ' + (on ? 'rgb(var(--brand-600))' : 'rgb(var(--ink-200))'),
                background: on ? 'rgb(var(--brand-50))' : 'transparent',
                color: on ? 'rgb(var(--brand-600))' : 'rgb(var(--ink-600))',
              }}>
              {it.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
