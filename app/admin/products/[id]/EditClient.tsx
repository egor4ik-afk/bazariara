'use client';

import ProducerPicker from '@/app/admin/ProducerPicker';
import { isVideoUrl } from '@/lib/media';
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Product = {
  id?: number;
  external_id?: string;
  source_url?: string;
  name?: string;
  name_ru?: string;
  name_en?: string;
  name_ka?: string;
  description_ru?: string;
  description_en?: string;
  description_ka?: string;
  sku?: string;
  price?: string | number;
  in_stock?: boolean;
  availability?: string;
  category_key?: string;
  category?: string;
  category_en?: string;
  category_ka?: string;
  sub_category?: string;
  sub_category_en?: string;
  sub_category_ka?: string;
  farmer_slug?: string;
  farmer_name?: string;
  producer_id?: number | null;
  image_url?: string;
  images?: string[];
} | null;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: 'rgb(var(--cream-200))',
  border: '1px solid rgb(var(--ink-200))', borderRadius: 8, color: 'rgb(var(--ink-900))',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'DM Mono', monospace",
};
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: 80 };

const InputField = memo(({ value, onChange, placeholder, type, step, disabled }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string; disabled?: boolean
}) => (
  <input type={type || 'text'} step={step} value={value}
    onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{...inputStyle, background: disabled? 'rgb(var(--ink-200))' : inputStyle.background}} disabled={disabled} />
));
InputField.displayName = 'InputField';

const TextareaField = memo(({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <textarea value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} style={textareaStyle} />
));
TextareaField.displayName = 'TextareaField';

function aiLabel(meta: any): string {
  if (!meta) return '';
  const who = meta.provider === 'yandex' ? '⚠️ Yandex (платно)' : 'OpenCode';
  return `${who} · ${meta.model} · ${(meta.ms / 1000).toFixed(1)}с`;
}

const FieldWrapper = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: 'block', color: 'rgb(var(--ink-500))', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))', borderRadius: 12, padding: '24px', marginBottom: 20 }}>
    <h3 style={{ color: 'rgb(var(--ink-500))', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px', fontWeight: 500 }}>{title}</h3>
    {children}
  </div>
);

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px', borderRadius: 10,
      background: type === 'ok' ? 'rgb(var(--brand-50))' : 'rgb(var(--clay))',
      border: `1px solid ${type === 'ok' ? 'rgb(var(--brand-600))' : 'rgb(var(--clay))'}`,
      color: type === 'ok' ? 'rgb(var(--brand-600))' : 'rgb(var(--clay))',
      fontSize: 13, fontFamily: "'DM Mono', monospace",
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'slideDown 0.2s ease',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 16 }}>{type === 'ok' ? '✓' : '✕'}</span>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: '0 0 0 8px' }}>×</button>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

export default function ProductEditClient({ product }: { product: Product }) {
  const router  = useRouter();
  const isNew   = !product;
  const fileRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
  }, []);


  const [images, setImages] = useState<string[]>(
    Array.isArray(product?.images) ? product.images
      : product?.image_url ? [product.image_url] : []
  );

  useEffect(() => {
    if (product?.images && Array.isArray(product.images)) setImages(product.images);
    else if (product?.image_url) setImages([product.image_url]);
    else setImages([]);
  }, [product]);

  const [uploading, setUploading] = useState<number | null>(null);

  const [form, setForm] = useState({
    external_id:     String(product?.external_id || ''),
    name_ru:         String(product?.name_ru || ''),
    name_en:         String(product?.name_en || ''),
    name_ka:         String(product?.name_ka || ''),
    description_ru:  String(product?.description_ru || ''),
    description_en:  String(product?.description_en || ''),
    description_ka:  String(product?.description_ka || ''),
    sku:             String(product?.sku || ''),
    price:           String(product?.price || ''),
    in_stock:        Boolean(product?.in_stock ?? true),
    availability: String(product?.availability || ''),
    category_key:    String(product?.category_key || ''),
    category:     String(product?.category || ''),
    category_en:     String(product?.category_en || ''),
    category_ka:     String(product?.category_ka || ''),
    sub_category: String(product?.sub_category || ''),
    sub_category_en: String(product?.sub_category_en || ''),
    sub_category_ka: String(product?.sub_category_ka || ''),
    farmer_slug:     String(product?.farmer_slug || ''),
    farmer_name:     String(product?.farmer_name || ''),
    producer_id:     product?.producer_id ?? null,
    source_url:      String(product?.source_url || ''),
  });

  const [cats, setCats] = useState<{
    category_key: string; name: string; name_en: string | null; name_ka: string | null;
  }[]>([]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(d => setCats(d.categories || []))
      .catch(() => {});
  }, []);

  function pickCategory(key: string) {
    const c = cats.find(x => x.category_key === key);
    if (!c) {
        setForm(prev => ({
            ...prev,
            category_key: '',
            category:     '',
            category_en:  '',
            category_ka:  '',
          }));
        return;
    }
    setForm(prev => ({
      ...prev,
      category_key: c.category_key,
      category:     c.name,
      category_en:  c.name_en || '',
      category_ka:  c.name_ka || '',
    }));
  }

  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const setField = useCallback((key: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // Кто последним ответил — показывается под кнопкой генерации.
  const [aiInfo, setAiInfo] = useState<any>(null);

  const [subs, setSubs] = useState<{ key: string; name: string; name_en: string | null; name_ka: string | null }[]>([]);
  const [translatingSub, setTranslatingSub] = useState(false);

  // Подкатегории выбранной категории: перечитываем при смене категории.
  useEffect(() => {
    if (!form.category_key) { setSubs([]); return; }
    fetch(`/api/admin/categories?subcategories=${encodeURIComponent(form.category_key)}`)
      .then(r => r.json())
      .then(d => setSubs(d.subcategories || []))
      .catch(() => setSubs([]));
  }, [form.category_key]);

  async function translateSub() {
    const ru = form.sub_category.trim();
    if (!ru) return;
    setTranslatingSub(true);
    try {
      const res = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_ru: ru, mode: 'name' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setForm(prev => ({ ...prev, sub_category: ru, sub_category_en: d.en || '', sub_category_ka: d.ka || '' }));
      showToast(`Переведено · ${aiLabel(d.meta)}`, 'ok');
    } catch (e: any) {
      showToast(`Не удалось перевести: ${e.message}`, 'err');
    }
    setTranslatingSub(false);
  }

  async function generateDescription() {
    if (!form.name_ru && !form.name_en && !form.name_ka) {
      showToast('Сначала введите название товара', 'err'); return;
    }
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_ru: form.name_ru, name_en: form.name_en, name_ka: form.name_ka,
          category: form.category, sub_category: form.sub_category,
          mode: 'description',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (data.ru) setField('description_ru', data.ru);
      if (data.en) setField('description_en', data.en);
      if (data.ka) setField('description_ka', data.ka);
      setAiInfo(data.meta || null);
      showToast(`Описание готово · ${aiLabel(data.meta)}`, 'ok');
    } catch (e) {
      showToast(`Ошибка генерации: ${e}`, 'err');
    }
    setGeneratingDesc(false);
  }

  /**
   * Видео — напрямую в бакет по подписанной ссылке. Через /api/admin/upload
   * оно не пройдёт: у функции Vercel лимит тела 4.5 МБ.
   */
  async function uploadVideo(file: File): Promise<string> {
    const signRes = await fetch('/api/admin/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, size: file.size }),
    });
    const sign = await signRes.json();
    if (!signRes.ok) throw new Error(sign.error || 'нет подписи');

    const put = await fetch(sign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': sign.contentType, 'x-amz-acl': 'public-read' },
      body: file,
    });
    if (!put.ok) throw new Error(`хранилище ответило ${put.status}`);
    return sign.publicUrl as string;
  }

  async function uploadFile(file: File, replaceIndex?: number) {
    const idx = replaceIndex ?? images.length;

    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      setUploading(idx);
      try {
        const url = await uploadVideo(file);
        setImages(prev => {
          const next = [...prev];
          if (replaceIndex !== undefined) next[replaceIndex] = url; else next.push(url);
          return next;
        });
        showToast('Видео загружено ✓', 'ok');
      } catch (e: any) {
        showToast(`Ошибка загрузки видео: ${e.message}`, 'err');
      }
      setUploading(null);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(idx);
    try {
      const res = await fetch(
        `/api/admin/upload?filename=${encodeURIComponent(file.name)}`,
        { method: 'POST', body: file }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // API возвращает готовый CDN url: https://cdn.relaxdev.ru/bazariara/admin/...
      const url: string = data.url;

      setImages(prev => {
        const next = [...prev];
        if (replaceIndex !== undefined) next[replaceIndex] = url;
        else next.push(url);
        return next;
      });
      showToast('Фото загружено ✓', 'ok');
    } catch (e) {
      showToast(`Ошибка загрузки: ${e}`, 'err');
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function removeImage(idx: number) {
    const cdnUrl = images[idx];
    setImages(prev => prev.filter((_, i) => i !== idx));
    try {
      await fetch(`/api/admin/upload?url=${encodeURIComponent(cdnUrl)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Ошибка удаления файла:', e);
    }
  }

  function makeMain(idx: number) {
    setImages(prev => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const method = isNew ? 'POST' : 'PATCH';
    const url    = isNew ? '/api/admin/products' : `/api/admin/products/${product?.id}`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        image_url: images[0] || null,
        images,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      showToast('Сохранено ✓', 'ok');
      if (isNew && data.id) router.push(`/admin/products/${data.id}`);
    } else {
      showToast('Ошибка сохранения', 'err');
    }
    setSaving(false);
  }

  async function deleteProduct() {
    if (!confirm('Удалить товар? Это необратимо.')) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/products/${product?.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/products');
    else { showToast('Ошибка удаления', 'err'); setDeleting(false); }
  }

  const mono = "'DM Mono', 'Fira Mono', monospace";

  return (
    <div style={{ fontFamily: mono, minHeight: '100vh', background: 'rgb(var(--cream-100))', color: 'rgb(var(--ink-900))' }}>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgb(var(--ink-200))', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/products" style={{ color: 'rgb(var(--ink-500))', textDecoration: 'none', fontSize: 13 }}>← Товары</Link>
          <span style={{ color: 'rgb(var(--ink-200))' }}>/</span>
          <span style={{ fontSize: 14, color: 'rgb(var(--ink-600))' }}>
            {isNew ? 'Новый товар' : String(product?.name_ru || product?.name || `ID ${product?.id}`)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!isNew && (
            <button onClick={deleteProduct} disabled={deleting}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgb(var(--clay))', borderRadius: 8, color: 'rgb(var(--clay))', fontSize: 13, cursor: 'pointer' }}>
              {deleting ? 'Удаляем...' : 'Удалить'}
            </button>
          )}
          {!isNew && product?.source_url && (
            <a href={product.source_url} target="_blank" rel="noreferrer"
              style={{ padding: '8px 14px', background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))', borderRadius: 8, color: 'rgb(var(--ink-600))', fontSize: 13, textDecoration: 'none' }}>
              → gorgia.ge
            </a>
          )}
          <button onClick={save} disabled={saving || uploading !== null}
            style={{ padding: '8px 20px', background: saving ? 'rgb(var(--ink-300))' : 'rgb(var(--brand-600))', border: 'none', borderRadius: 8, color: saving ? 'rgb(var(--ink-500))' : 'rgb(var(--cream-100))', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Левая колонка */}
        <div>
          <Section title="Название">
            <FieldWrapper label="Русский">
              <InputField value={form.name_ru} onChange={v => setField('name_ru', v)} placeholder="Название на русском" />
            </FieldWrapper>
            <FieldWrapper label="English">
              <InputField value={form.name_en} onChange={v => setField('name_en', v)} placeholder="Product name in English" />
            </FieldWrapper>
            <FieldWrapper label="ქართული">
              <InputField value={form.name_ka} onChange={v => setField('name_ka', v)} placeholder="სახელი ქართულად" />
            </FieldWrapper>
          </Section>

          <Section title="Описание">
            <button
              onClick={generateDescription}
              disabled={generatingDesc}
              style={{
                width: '100%', padding: '9px', marginBottom: 16,
                background: generatingDesc ? 'rgb(var(--surface))' : 'linear-gradient(135deg, rgb(var(--surface)) 0%, rgb(var(--ink-100)) 100%)',
                border: '1px solid rgb(var(--ink-300))', borderRadius: 8,
                color: generatingDesc ? 'rgb(var(--ink-500))' : 'rgb(var(--brand-600))', fontSize: 13, fontWeight: 600,
                cursor: generatingDesc ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 16 }}>✨</span>
              {generatingDesc ? 'Генерируем...' : 'Сгенерировать описание AI (3 языка)'}
            </button>
            {aiInfo && (
              <p style={{ fontSize: 11, marginTop: 6,
                          color: aiInfo.provider === 'yandex' ? 'rgb(var(--clay))' : 'rgb(var(--ink-500))' }}>
                Ответил: {aiLabel(aiInfo)}
                {aiInfo.skipped?.length ? ` · не ответили: ${aiInfo.skipped.length}` : ''}
                {aiInfo.note ? ` · ${aiInfo.note}` : ''}
              </p>
            )}
            <FieldWrapper label="Русский">
              <TextareaField value={form.description_ru} onChange={v => setField('description_ru', v)} placeholder="Описание..." />
            </FieldWrapper>
            <FieldWrapper label="English">
              <TextareaField value={form.description_en} onChange={v => setField('description_en', v)} placeholder="Description..." />
            </FieldWrapper>
            <FieldWrapper label="ქართული">
              <TextareaField value={form.description_ka} onChange={v => setField('description_ka', v)} placeholder="აღწერა..." />
            </FieldWrapper>
          </Section>

          <Section title="Фермер / производитель">
            <p style={{ fontSize: 12, color: 'rgb(var(--ink-500))', margin: '0 0 12px' }}>
              Выберите из списка производителей. Имя и ссылка на страницу фермера
              подставятся на сайте сами. Чтобы товар был без фермера — нажмите ×.
            </p>
            <FieldWrapper label="Фермер">
              <ProducerPicker
                value={form.producer_id ?? null}
                onChange={(id, p) => setForm(prev => ({
                  ...prev,
                  producer_id: id,
                  // имя и slug проставит триггер в БД; здесь — только
                  // чтобы превью в форме сразу было актуальным
                  farmer_slug: p ? p.slug : '',
                  farmer_name: p ? p.name : '',
                }))}
              />
            </FieldWrapper>
            <p style={{ fontSize: 11, color: 'rgb(var(--ink-500))', marginTop: 6 }}>
              Нужного фермера нет? Создайте его в разделе{' '}
              <a href="/admin/producers" style={{ color: 'rgb(var(--brand-600))' }}>Производители</a>.
            </p>
          </Section>

          <Section title="Категория">
          <FieldWrapper label="Категория">
            <select
                value={form.category_key || ''}
                onChange={e => pickCategory(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgb(var(--cream-200))',
                        border: '1px solid rgb(var(--ink-200))', borderRadius: 8, color: 'rgb(var(--ink-900))',
                        fontSize: 13, outline: 'none' }}
            >
                <option value="">— выберите категорию —</option>
                {cats.map(c => (
                <option key={c.category_key} value={c.category_key}>
                    {c.name} ({c.category_key})
                </option>
                ))}
            </select>
            </FieldWrapper>
            <FieldWrapper label="Категория (ru)">
                <InputField value={form.category} onChange={v => setField('category',v)} disabled/>
            </FieldWrapper>
            <FieldWrapper label="Category (en)">
              <InputField value={form.category_en} onChange={v => setField('category_en', v)} disabled/>
            </FieldWrapper>
            <FieldWrapper label="კატეგორია (ka)">
              <InputField value={form.category_ka} onChange={v => setField('category_ka', v)} disabled/>
            </FieldWrapper>

            {/* Подкатегория: сначала выбор из уже существующих в этой
                категории — с готовыми переводами. Ручной ввод остался
                для новой, и её можно перевести кнопкой. */}
            <FieldWrapper label="Подкатегория">
              <select
                value={subs.some(x => x.name === form.sub_category) ? form.sub_category : (form.sub_category ? '__custom' : '')}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '__custom') { setField('sub_category', form.sub_category || ' '); return; }
                  const sub = subs.find(x => x.name === v);
                  setForm(prev => ({
                    ...prev,
                    sub_category:    sub ? sub.name : '',
                    sub_category_en: sub ? (sub.name_en || '') : '',
                    sub_category_ka: sub ? (sub.name_ka || '') : '',
                  }));
                }}
                style={{ width: '100%', padding: '9px 12px', background: 'rgb(var(--cream-200))',
                         border: '1px solid rgb(var(--ink-200))', borderRadius: 8,
                         color: 'rgb(var(--ink-900))', fontSize: 13, outline: 'none' }}
              >
                <option value="">— без подкатегории —</option>
                {subs.map(x => (
                  <option key={x.key} value={x.name}>
                    {x.name}{x.name_en ? ` · ${x.name_en}` : ''}
                  </option>
                ))}
                <option value="__custom">+ Новая подкатегория…</option>
              </select>
            </FieldWrapper>

            {form.sub_category && !subs.some(x => x.name === form.sub_category) && (
              <>
                <FieldWrapper label="Новая подкатегория (ru)">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flexGrow: 1 }}>
                      <InputField value={form.sub_category.trim()} onChange={v => setField('sub_category', v)} />
                    </div>
                    <button
                      type="button"
                      onClick={translateSub}
                      disabled={translatingSub || !form.sub_category.trim()}
                      style={{ padding: '0 12px', borderRadius: 8, border: '1px solid rgb(var(--ink-200))',
                               background: 'transparent', color: 'rgb(var(--brand-600))', fontSize: 12,
                               fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {translatingSub ? 'Переводим…' : '🌐 Перевести'}
                    </button>
                  </div>
                </FieldWrapper>
                <FieldWrapper label="Subcategory (en)">
                  <InputField value={form.sub_category_en} onChange={v => setField('sub_category_en', v)} />
                </FieldWrapper>
                <FieldWrapper label="ქვეკატეგორია (ka)">
                  <InputField value={form.sub_category_ka} onChange={v => setField('sub_category_ka', v)} />
                </FieldWrapper>
              </>
            )}
          </Section>
        </div>

        {/* Правая колонка */}
        <div>
          <Section title="Коммерция">
            <FieldWrapper label="SKU / Артикул">
              <InputField value={form.sku} onChange={v => setField('sku', v)} placeholder="BM-001234" />
            </FieldWrapper>
            <FieldWrapper label="Цена (GEL)">
              <InputField value={form.price} onChange={v => setField('price', v)} placeholder="99.00" type="number" step="0.01" />
            </FieldWrapper>
            <FieldWrapper label="Наличие">
              <div style={{ display: 'flex', gap: 10 }}>
                {([true, false] as const).map(v => (
                  <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="in_stock" checked={form.in_stock === v} onChange={() => setField('in_stock', v)} style={{ accentColor: 'rgb(var(--brand-600))' }} />
                    <span style={{ color: v ? 'rgb(var(--brand-600))' : 'rgb(var(--clay))', fontSize: 13 }}>{v ? 'В наличии' : 'Нет в наличии'}</span>
                  </label>
                ))}
              </div>
            </FieldWrapper>
            <FieldWrapper label="Наличие (текст)">
              <InputField value={form.availability} onChange={v => setField('availability', v)} placeholder="В наличии / Нет в наличии" />
            </FieldWrapper>
          </Section>

          {/* Фото */}
          <Section title={`Фото и видео (${images.length})`}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,.heic,.heif,.HEIC,.HEIF,.jfif"
            multiple
            style={{ display: 'none' }}
            onChange={e => { Array.from(e.target.files || []).forEach(f => uploadFile(f)); }}
            />

            <button onClick={() => fileRef.current?.click()} disabled={uploading !== null}
              style={{ width: '100%', padding: '10px', marginBottom: 16, background: 'rgb(var(--cream-200))', border: '2px dashed rgb(var(--ink-200))', borderRadius: 8, color: uploading !== null ? 'rgb(var(--ink-500))' : 'rgb(var(--brand-600))', fontSize: 13, cursor: uploading !== null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {uploading !== null ? '⟳ Загружаем...' : '+ Добавить фото или видео'}
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Array.isArray(images) && images.map((img, i) => (
                <div key={img} style={{ position: 'relative', aspectRatio: '1', background: 'rgb(var(--cream-200))', borderRadius: 8, overflow: 'hidden', border: i === 0 ? '2px solid rgb(var(--brand-600))' : '2px solid rgb(var(--ink-200))' }}>
                  {uploading === i
                    ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(var(--ink-500))', fontSize: 11 }}>⟳ загрузка…</div>
                    : isVideoUrl(img)
                      ? <video src={img} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  }
                  {i === 0 && (
                    <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgb(var(--brand-600))', color: 'rgb(var(--cream-100))', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>ГЛАВНОЕ</div>
                  )}
                  <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                    {i !== 0 && (
                      <button onClick={() => makeMain(i)} title="Сделать главным"
                        style={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, color: 'rgb(var(--brand-600))', fontSize: 12, width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>★</button>
                    )}
                    <button onClick={() => removeImage(i)} title="Удалить"
                      style={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 4, color: 'rgb(var(--clay))', fontSize: 12, width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                </div>
              ))}
              <div onClick={() => fileRef.current?.click()}
                style={{ aspectRatio: '1', background: 'rgb(var(--cream-200))', borderRadius: 8, border: '2px dashed rgb(var(--ink-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgb(var(--ink-300))', fontSize: 24 }}>+</div>
            </div>

            {images.length > 0 && (
              <div style={{ color: 'rgb(var(--ink-300))', fontSize: 11, marginTop: 8 }}>★ — сделать главным · ✕ — удалить · первое фото = главное</div>
            )}
          </Section>

          <Section title="Ссылка и идентификаторы">
            <FieldWrapper label="external_id">
              <InputField value={form.external_id} onChange={v => setField('external_id', v)} placeholder="ikea_71063" />
            </FieldWrapper>
            <FieldWrapper label="URL на gorgia.ge">
              <InputField value={form.source_url} onChange={v => setField('source_url', v)} placeholder="https://gorgia.ge/ka/..." />
            </FieldWrapper>
            {!isNew && (
              <div style={{ color: 'rgb(var(--ink-300))', fontSize: 11, marginTop: 4 }}>
                ID: {product?.id} · external_id: {product?.external_id || '—'}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}