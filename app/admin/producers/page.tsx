'use client';

import { useEffect, useState, useCallback } from 'react';
import { translateFields, type FieldSpec } from '@/lib/translate-client';

type Producer = {
  id: number; slug: string; name: string; name_en: string | null; name_ka: string | null;
  region_id: number | null; region_name: string | null; locality: string | null;
  description: string | null; image_url: string | null;
  website: string | null; instagram: string | null; facebook: string | null;
  status: string; seo_title: string | null; seo_description: string | null;
  sort_order: number; product_count: number;
  description_en?: string | null; description_ka?: string | null;
  locality_en?: string | null; locality_ka?: string | null;
  seo_title_en?: string | null; seo_title_ka?: string | null;
  seo_description_en?: string | null; seo_description_ka?: string | null;
};

type Application = {
  id: number; contact_name: string; brand_name: string; phone: string;
  region: string | null; products: string; social: string | null;
  description: string | null; status: string; admin_note: string | null;
  created_at: string;
};

type Region = { id: number; slug: string; name: string };

/** Переводимые поля хозяйства. Slug, регион, фото и соцсети — общие. */
const PRODUCER_FIELDS: FieldSpec[] = [
  { from: 'name',            kind: 'title',           label: 'название' },
  { from: 'locality',        kind: 'title',           label: 'населённый пункт' },
  { from: 'description',     kind: 'plain',           label: 'история' },
  { from: 'seo_title',       kind: 'seo_title',       label: 'SEO Title' },
  { from: 'seo_description', kind: 'seo_description', label: 'SEO Description' },
];

const box = { background: 'rgb(var(--cream-200))', border: '1px solid rgb(var(--ink-200))', borderRadius: 8, color: 'rgb(var(--ink-900))', padding: '8px 11px', fontSize: 13, outline: 'none', width: '100%' } as const;
const card = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))', borderRadius: 12, padding: 16 } as const;

export default function ProducersAdmin() {
  const [tab, setTab] = useState<'producers' | 'applications'>('producers');
  const [producers, setProducers] = useState<Producer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [editing, setEditing] = useState<Partial<Producer> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<'ru' | 'en' | 'ka'>('ru');
  const [linked, setLinked] = useState<any[]>([]);
  const [translating, setTranslating] = useState<string | null>(null);

  const autoTranslate = async (langs: ('en' | 'ka')[], engine: 'google' | 'review' = 'google') => {
    if (!editing?.name) { setMsg('Сначала заполните русское название'); return; }
    const hasExisting = langs.some((l) =>
      PRODUCER_FIELDS.some((f) => String((editing as any)[`${f.from}_${l}`] || '').trim()));
    // Вычитка работает по уже готовому переводу — спрашивать про
    // перезапись незачем, она и есть правка.
    const overwrite = engine === 'google' && hasExisting
      ? confirm('Часть перевода уже заполнена. Перезаписать её?\n\nОК — всё заново\nОтмена — только пустые поля')
      : false;
    setTranslating('Начинаем…');
    try {
      const out = await translateFields(editing, PRODUCER_FIELDS, langs, {
        engine,
        overwrite, onProgress: (m) => setTranslating(m),
      });
      setEditing((prev) => ({ ...prev!, ...out }));
      setMsg(Object.keys(out).length
        ? `Переведено полей: ${Object.keys(out).length}. Проверьте и сохраните.`
        : 'Нечего переводить — всё уже заполнено.');
    } catch (e: any) {
      setMsg(`Перевод прервался: ${e.message}`);
    } finally {
      setTranslating(null);
    }
  };

  const load = useCallback(async () => {
    const [p, a, r] = await Promise.all([
      fetch('/api/admin/producers?what=producers').then((x) => x.json()),
      fetch('/api/admin/producers?what=applications').then((x) => x.json()),
      fetch('/api/admin/producers?what=regions').then((x) => x.json()),
    ]);
    setProducers(p.producers || []);
    setApplications(a.applications || []);
    setRegions(r.regions || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Список товаров фермера — подгружаем при открытии редактора (ТЗ 4.1).
  useEffect(() => {
    if (!editing?.id) { setLinked([]); return; }
    fetch(`/api/admin/producers?what=products&id=${editing.id}`)
      .then((r) => r.json())
      .then((d) => setLinked(d.products || []));
  }, [editing?.id]);

  /** Поле текущего языка: name → name_en / name_ka. RU — базовое поле. */
  const k = (base: string) => (lang === 'ru' ? base : `${base}_${lang}`) as keyof Producer;
  const v = (base: string) => ((editing as any)?.[k(base)] as string) || '';
  const setL = (base: string) => (e: any) => setEditing({ ...editing!, [k(base)]: e.target.value });

  const save = async () => {
    if (!editing) return;
    const res = await fetch('/api/admin/producers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    const data = await res.json();
    setMsg(res.ok ? 'Сохранено' : `Ошибка: ${data.error}`);
    if (res.ok) { setEditing(null); load(); }
  };

  const act = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/producers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMsg(res.ok ? 'Готово' : `Ошибка: ${data.error}`);
    load();
  };

  const newCount = applications.filter((a) => a.status === 'new').length;

  return (
    <div style={{ padding: 24, color: 'rgb(var(--ink-900))', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Производители</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['producers', 'applications'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid rgb(var(--ink-200))', cursor: 'pointer',
              background: tab === k ? 'rgb(var(--brand-600))' : 'rgb(var(--surface))',
              color: 'rgb(var(--ink-900))',
            }}
          >
            {k === 'producers' ? `Хозяйства (${producers.length})` : `Заявки${newCount ? ` (${newCount} новых)` : ''}`}
          </button>
        ))}
        {tab === 'producers' && (
          <button
            onClick={() => setEditing({ status: 'active', sort_order: 100 })}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                     border: 'none', background: 'rgb(var(--brand-600))', color: 'rgb(var(--on-brand))', cursor: 'pointer', marginLeft: 'auto' }}
          >
            + Добавить
          </button>
        )}
      </div>

      {msg && <p style={{ color: 'rgb(var(--brand-600))', fontSize: 13, marginBottom: 12 }}>{msg}</p>}

      {/* ─────────── Редактор ─────────── */}
      {editing && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
            {editing.id ? `Правка: ${editing.name}` : 'Новое хозяйство'}
          </h2>

          {/* Языки (ТЗ 5.1): каждое переводимое поле заполняется
              независимо. Пустой перевод на сайте падает на русский. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center' }}>
            {(['ru', 'en', 'ka'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                         border: '1px solid rgb(var(--ink-200))',
                         background: lang === l ? 'rgb(var(--brand-600))' : 'transparent',
                         color: lang === l ? 'rgb(var(--on-brand))' : 'rgb(var(--ink-700))' }}>
                {l.toUpperCase()}
              </button>
            ))}
            <span style={{ fontSize: 11, color: 'rgb(var(--ink-500))', marginLeft: 6 }}>
              {lang === 'ru' ? 'основной язык — обязателен'
                : 'перевод; если пусто, на сайте будет русский текст'}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {translating ? (
                <span style={{ fontSize: 12, color: 'rgb(var(--brand-600))', fontWeight: 600 }}>🌐 {translating}</span>
              ) : (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  {(['google', 'review'] as const).map((eng) => (
                    <button
                      key={eng}
                      onClick={() => autoTranslate(lang === 'ru' ? ['en', 'ka'] : [lang as 'en' | 'ka'], eng)}
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                               border: '1px solid rgb(var(--brand-300))',
                               background: eng === 'google' ? 'rgb(var(--brand-50))' : 'transparent',
                               color: 'rgb(var(--brand-700))', whiteSpace: 'nowrap' }}
                    >
                      {eng === 'google'
                        ? `🌐 ${lang === 'ru' ? 'Перевести на EN и KA' : `Перевести на ${lang.toUpperCase()}`}`
                        : '✨ Проверить AI'}
                    </button>
                  ))}
                </span>
              )}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <Field label={`Название (${lang.toUpperCase()})`}>
              <input style={box} value={v('name')} onChange={setL('name')} />
            </Field>
            <Field label={`Населённый пункт (${lang.toUpperCase()})`}>
              <input style={box} value={v('locality')} onChange={setL('locality')} />
            </Field>

            {lang === 'ru' && (
              <>
                <Field label="slug (URL — одинаковый для всех языков)">
                  <input style={box} value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="chventan" />
                </Field>
                <Field label="Регион">
                  <select style={box} value={editing.region_id ?? ''} onChange={(e) => setEditing({ ...editing, region_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">— не указан —</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Field>
                <Field label="Статус">
                  <select style={box} value={editing.status || 'active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    <option value="active">Активен (виден на сайте)</option>
                    <option value="hidden">Скрыт</option>
                  </select>
                </Field>
                <Field label="Фото (URL)">
                  <input style={box} value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
                </Field>
                <Field label="Сайт">
                  <input style={box} value={editing.website || ''} onChange={(e) => setEditing({ ...editing, website: e.target.value })} />
                </Field>
                <Field label="Instagram">
                  <input style={box} value={editing.instagram || ''} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} />
                </Field>
              </>
            )}
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <Field label={`История хозяйства (${lang.toUpperCase()}) — абзацы разделяйте пустой строкой`}>
              <textarea style={{ ...box, minHeight: 120, fontFamily: 'inherit' }}
                value={v('description')} onChange={setL('description')} />
            </Field>
            <Field label={`SEO Title (${lang.toUpperCase()})`}>
              <input style={box} value={v('seo_title')} onChange={setL('seo_title')} />
            </Field>
            <Field label={`SEO Description (${lang.toUpperCase()})`}>
              <textarea style={{ ...box, minHeight: 50, fontFamily: 'inherit' }}
                value={v('seo_description')} onChange={setL('seo_description')} />
            </Field>
          </div>

          {/* Связанные товары (ТЗ 4.1). Добавляются из карточки товара:
              связь хранится в products.producer_id, дублировать её
              ещё и здесь значило бы завести второй источник правды. */}
          {editing.id && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgb(var(--ink-200))' }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Товары фермера: {linked.length}
              </p>
              {linked.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgb(var(--ink-500))' }}>
                  Пока нет. Откройте товар в разделе «Товары» и выберите этого фермера
                  в блоке «Фермер / производитель».
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {linked.map((p) => (
                    <a key={p.id} href={`/admin/products/${p.id}`}
                       style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 6,
                                borderRadius: 8, textDecoration: 'none', color: 'rgb(var(--ink-900))',
                                border: '1px solid rgb(var(--ink-200))' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                        : <span style={{ width: 36, height: 36 }} />}
                      <span style={{ flexGrow: 1, fontSize: 13 }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: 'rgb(var(--ink-500))' }}>
                        {p.price ? `${p.price} ₾` : '—'}
                      </span>
                      {!p.in_stock && (
                        <span style={{ fontSize: 11, color: 'rgb(var(--clay))' }}>не в продаже</span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} disabled={Boolean(translating)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'rgb(var(--brand-600))', color: 'rgb(var(--on-brand))', fontWeight: 700, cursor: 'pointer' }}>
              Сохранить
            </button>
            <button onClick={() => setEditing(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--ink-600))', cursor: 'pointer' }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ─────────── Список хозяйств ─────────── */}
      {tab === 'producers' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {producers.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>
                  {p.name}
                  <span style={{ fontSize: 12, color: 'rgb(var(--ink-500))', fontWeight: 400 }}> /{p.slug}</span>
                  {p.status !== 'active' && <span style={{ marginLeft: 8, fontSize: 11, color: 'rgb(var(--clay))' }}>скрыт</span>}
                </p>
                <p style={{ fontSize: 12, color: 'rgb(var(--ink-500))' }}>
                  {[p.region_name, p.locality].filter(Boolean).join(', ') || 'регион не указан'} · товаров: {p.product_count}
                </p>
              </div>
              <a href={`/ru/farmers/${p.slug}`} target="_blank" rel="noreferrer"
                 style={{ fontSize: 12, color: 'rgb(var(--brand-600))' }}>открыть</a>
              <button onClick={() => setEditing(p)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--ink-900))', fontSize: 12, cursor: 'pointer' }}>
                Править
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─────────── Заявки ─────────── */}
      {tab === 'applications' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {applications.length === 0 && <p style={{ color: 'rgb(var(--ink-500))', fontSize: 13 }}>Заявок пока нет.</p>}
          {applications.map((a) => (
            <div key={a.id} style={{ ...card, opacity: a.status === 'new' ? 1 : 0.6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{a.brand_name}</p>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99,
                               background: a.status === 'new' ? 'rgb(var(--brand-600))' : 'rgb(var(--ink-200))' }}>
                  {a.status === 'new' ? 'новая' : a.status}
                </span>
                <span style={{ fontSize: 11, color: 'rgb(var(--ink-500))', marginLeft: 'auto' }}>
                  {new Date(a.created_at).toLocaleString('ru-RU')}
                </span>
              </div>

              <p style={{ fontSize: 13, color: 'rgb(var(--ink-700))', marginTop: 6 }}>
                {a.contact_name} · <a href={`tel:${a.phone}`} style={{ color: 'rgb(var(--brand-600))' }}>{a.phone}</a>
                {a.region && ` · ${a.region}`}
              </p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Производит: {a.products}</p>
              {a.social && <p style={{ fontSize: 12, color: 'rgb(var(--ink-500))', marginTop: 4 }}>{a.social}</p>}
              {a.description && <p style={{ fontSize: 12, color: 'rgb(var(--ink-600))', marginTop: 8, whiteSpace: 'pre-line' }}>{a.description}</p>}
              {a.admin_note && <p style={{ fontSize: 11, color: 'rgb(var(--ink-500))', marginTop: 8 }}>{a.admin_note}</p>}

              {a.status === 'new' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => act({ action: 'application_to_producer', id: a.id })}
                    style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: 'rgb(var(--brand-600))', color: 'rgb(var(--on-brand))', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Создать хозяйство (черновик)
                  </button>
                  <button
                    onClick={() => act({ action: 'application_status', id: a.id, status: 'rejected' })}
                    style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgb(var(--ink-200))', background: 'transparent', color: 'rgb(var(--ink-600))', fontSize: 12, cursor: 'pointer' }}
                  >
                    Отклонить
                  </button>
                </div>
              )}
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
      <label style={{ display: 'block', fontSize: 11, color: 'rgb(var(--ink-500))', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
