'use client';

import { useEffect, useState, useCallback } from 'react';

type Post = {
  id: number; slug: string; title: string; excerpt: string | null;
  body: string; cover_url: string | null; status: string;
  seo_title: string | null; seo_description: string | null;
  author_name: string; published_at: string | null; updated_at: string;
  title_en?: string | null; title_ka?: string | null;
  excerpt_en?: string | null; excerpt_ka?: string | null;
  body_en?: string | null; body_ka?: string | null;
};

type Links = { regions: number[]; producers: number[]; products: number[]; tags: number[] };

const box = { background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 13, outline: 'none', width: '100%' } as const;
const card = { background: '#1a1d28', border: '1px solid #2a2d3a', borderRadius: 12, padding: 16 } as const;

const EMPTY: Partial<Post> = { status: 'draft', author_name: 'BAZARI ARA', body: '' };
const EMPTY_LINKS: Links = { regions: [], producers: [], products: [], tags: [] };

export default function BlogAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refs, setRefs] = useState<{ regions: any[]; producers: any[]; tags: any[] }>({ regions: [], producers: [], tags: [] });
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [links, setLinks] = useState<Links>(EMPTY_LINKS);
  const [msg, setMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<'ru' | 'en' | 'ka'>('ru');

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

  const suffix = lang === 'ru' ? '' : `_${lang}`;
  const field = (base: 'title' | 'excerpt' | 'body') => (base + suffix) as keyof Post;

  return (
    <div style={{ padding: 24, color: '#fff', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Блог — путеводитель по Грузии</h1>
        {!editing && (
          <button
            onClick={() => { setEditing({ ...EMPTY }); setLinks(EMPTY_LINKS); }}
            style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: 'none', background: '#5E9C3C', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            + Новая статья
          </button>
        )}
      </div>

      {msg && <p style={{ color: '#A6CE8A', fontSize: 13, marginBottom: 12 }}>{msg}</p>}

      {editing ? (
        <div style={{ ...card }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['ru', 'en', 'ka'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                         border: '1px solid #2a2d3a', background: lang === l ? '#487B2C' : 'transparent', color: '#fff' }}>
                {l.toUpperCase()}
              </button>
            ))}
            <span style={{ fontSize: 11, color: '#8b90a0', alignSelf: 'center', marginLeft: 6 }}>
              {lang === 'ru' ? 'основной язык' : 'перевод, можно оставить пустым'}
            </span>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <Field label={`Заголовок (${lang.toUpperCase()})`}>
              <input style={box} value={(editing[field('title')] as string) || ''} onChange={set(field('title'))} />
            </Field>

            {lang === 'ru' && (
              <Field label="Адрес статьи (slug)">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={box} value={editing.slug || ''} onChange={set('slug')} placeholder="chto-privezti-iz-gruzii" />
                  <button onClick={autoSlug} style={{ padding: '0 14px', borderRadius: 8, border: '1px solid #2a2d3a', background: 'transparent', color: '#aaa', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
              <textarea style={{ ...box, minHeight: 320, fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.6 }}
                value={(editing[field('body')] as string) || ''} onChange={set(field('body'))} />
            </Field>

            {lang === 'ru' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                  <Field label="Обложка (URL)">
                    <input style={box} value={editing.cover_url || ''} onChange={set('cover_url')} />
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

                <Field label="SEO Title (если пусто — берётся заголовок)">
                  <input style={box} value={editing.seo_title || ''} onChange={set('seo_title')} />
                </Field>
                <Field label="SEO Description">
                  <textarea style={{ ...box, minHeight: 50, fontFamily: 'inherit' }}
                    value={editing.seo_description || ''} onChange={set('seo_description')} />
                </Field>

                <Picker title="Регионы" items={refs.regions} selected={links.regions} onToggle={(id) => toggle('regions', id)} />
                <Picker title="Производители" items={refs.producers} selected={links.producers} onToggle={(id) => toggle('producers', id)} />
                <Picker title="Рубрики" items={refs.tags} selected={links.tags} onToggle={(id) => toggle('tags', id)} />
                <p style={{ fontSize: 11, color: '#8b90a0' }}>
                  Связи работают в обе стороны: статья покажет блоки с регионом и производителем,
                  а на их страницах появится ссылка на статью.
                </p>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={save} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#5E9C3C', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Сохранить
            </button>
            <button onClick={() => { setEditing(null); setLinks(EMPTY_LINKS); }}
              style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #2a2d3a', background: 'transparent', color: '#aaa', cursor: 'pointer' }}>
              Отмена
            </button>
            {editing.slug && editing.status === 'published' && (
              <a href={`/ru/blog/${editing.slug}`} target="_blank" rel="noreferrer"
                 style={{ alignSelf: 'center', marginLeft: 'auto', color: '#A6CE8A', fontSize: 12 }}>
                Открыть на сайте →
              </a>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {posts.length === 0 && <p style={{ color: '#8b90a0', fontSize: 13 }}>Статей пока нет.</p>}
          {posts.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>
                  {p.title}
                  <span style={{
                    marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 99,
                    background: p.status === 'published' ? '#487B2C' : '#2a2d3a',
                    color: p.status === 'published' ? '#fff' : '#8b90a0',
                  }}>
                    {p.status === 'published' ? 'опубликована' : p.status === 'draft' ? 'черновик' : 'скрыта'}
                  </span>
                </p>
                <p style={{ fontSize: 12, color: '#8b90a0' }}>
                  /blog/{p.slug} · {new Date(p.updated_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <button onClick={() => open(p.id)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #2a2d3a', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                Править
              </button>
              <button onClick={() => remove(p.id)}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #3a2a2a', background: 'transparent', color: '#C2703D', fontSize: 12, cursor: 'pointer' }}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#8b90a0', marginBottom: 5 }}>{label}</label>
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
      <label style={{ display: 'block', fontSize: 11, color: '#8b90a0', marginBottom: 6 }}>{title}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((it) => {
          const on = selected.includes(it.id);
          return (
            <button key={it.id} onClick={() => onToggle(it.id)}
              style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                border: '1px solid ' + (on ? '#5E9C3C' : '#2a2d3a'),
                background: on ? '#1e2a0e' : 'transparent',
                color: on ? '#A6CE8A' : '#aaa',
              }}>
              {it.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
