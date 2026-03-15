'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Product = Record<string, unknown> | null;

const field = (label: string, children: React.ReactNode) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: 'block', color: '#666', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: '#131620',
  border: '1px solid #2a2d3a', borderRadius: 8, color: '#e2e4ec',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'DM Mono', monospace",
};

const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: 80 };

export default function ProductEditClient({ product }: { product: Product }) {
  const router = useRouter();
  const isNew = !product;

  const [form, setForm] = useState({
    name_ru:          String(product?.name_ru || ''),
    name_en:          String(product?.name_en || ''),
    name_ka:          String(product?.name_ka || ''),
    description_ru:   String(product?.description_ru || ''),
    description_en:   String(product?.description_en || ''),
    description_ka:   String(product?.description_ka || ''),
    sku:              String(product?.sku || ''),
    price:            String(product?.price || ''),
    in_stock:         Boolean(product?.in_stock ?? true),
    availability_ru:  String(product?.availability_ru || ''),
    category_ru:      String(product?.category_ru || product?.category || ''),
    category_en:      String(product?.category_en || ''),
    category_ka:      String(product?.category_ka || ''),
    sub_category_ru:  String(product?.sub_category_ru || product?.sub_category || ''),
    sub_category_en:  String(product?.sub_category_en || ''),
    sub_category_ka:  String(product?.sub_category_ka || ''),
    image_url:        String(product?.image_url || ''),
    source_url:       String(product?.source_url || ''),
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  function set(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg('');
    const method = isNew ? 'POST' : 'PATCH';
    const url = isNew ? '/api/admin/products' : `/api/admin/products/${product?.id}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setMsgType('ok');
      setMsg('Сохранено ✓');
      if (isNew && data.id) router.push(`/admin/products/${data.id}`);
    } else {
      setMsgType('err');
      setMsg('Ошибка сохранения');
    }
    setSaving(false);
  }

  async function deleteProduct() {
    if (!confirm('Удалить товар? Это необратимо.')) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/products/${product?.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/admin/products');
    } else {
      setMsg('Ошибка удаления');
      setMsgType('err');
      setDeleting(false);
    }
  }

  const mono = "'DM Mono', 'Fira Mono', monospace";
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '24px', marginBottom: 20 }}>
      <h3 style={{ color: '#666', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px', fontWeight: 500 }}>{title}</h3>
      {children}
    </div>
  );

  const inp = (key: string, placeholder = '') => (
    <input value={form[key as keyof typeof form] as string} onChange={e => set(key, e.target.value)} placeholder={placeholder} style={inputStyle} />
  );
  const ta = (key: string, placeholder = '') => (
    <textarea value={form[key as keyof typeof form] as string} onChange={e => set(key, e.target.value)} placeholder={placeholder} style={textareaStyle} />
  );

  return (
    <div style={{ fontFamily: mono, minHeight: '100vh', background: '#0f1117', color: '#e2e4ec' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2d3a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/products" style={{ color: '#555', textDecoration: 'none', fontSize: 13 }}>← Товары</Link>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ fontSize: 14, color: '#aaa' }}>{isNew ? 'Новый товар' : String(product?.name_ru || product?.name || `ID ${product?.id}`)}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 12, color: msgType === 'ok' ? '#4ade80' : '#f87171' }}>{msg}</span>}
          {!isNew && (
            <button onClick={deleteProduct} disabled={deleting} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #3a1a1a', borderRadius: 8, color: '#f87171', fontSize: 13, cursor: 'pointer' }}>
              {deleting ? 'Удаляем...' : 'Удалить'}
            </button>
          )}
          {!isNew && product?.source_url && (
            <a href={product.source_url as string} target="_blank" rel="noreferrer" style={{ padding: '8px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#aaa', fontSize: 13, textDecoration: 'none' }}>
              → gorgia.ge
            </a>
          )}
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: saving ? '#444' : '#c8f135', border: 'none', borderRadius: 8, color: saving ? '#888' : '#0f1117', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        <div>
          <Section title="Название">
            {field('Русский', inp('name_ru', 'Название на русском'))}
            {field('English', inp('name_en', 'Product name in English'))}
            {field('ქართული', inp('name_ka', 'სახელი ქართულად'))}
          </Section>

          <Section title="Описание">
            {field('Русский', ta('description_ru', 'Описание...'))}
            {field('English', ta('description_en', 'Description...'))}
            {field('ქართული', ta('description_ka', 'აღწერა...'))}
          </Section>

          <Section title="Категория">
            {field('Категория (ru)', inp('category_ru'))}
            {field('Category (en)', inp('category_en'))}
            {field('კატეგორია (ka)', inp('category_ka'))}
            {field('Подкатегория (ru)', inp('sub_category_ru'))}
            {field('Subcategory (en)', inp('sub_category_en'))}
            {field('ქვეკატეგორია (ka)', inp('sub_category_ka'))}
          </Section>
        </div>

        <div>
          <Section title="Коммерция">
            {field('SKU / Артикул', inp('sku', 'BM-001234'))}
            {field('Цена (GEL)', (
              <input type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} style={inputStyle} placeholder="99.00" />
            ))}
            {field('Наличие', (
              <div style={{ display: 'flex', gap: 10 }}>
                {[true, false].map(v => (
                  <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="in_stock" checked={form.in_stock === v} onChange={() => set('in_stock', v)}
                      style={{ accentColor: '#c8f135' }} />
                    <span style={{ color: v ? '#4ade80' : '#f87171', fontSize: 13 }}>{v ? 'В наличии' : 'Нет в наличии'}</span>
                  </label>
                ))}
              </div>
            ))}
            {field('Наличие (текст)', inp('availability_ru', 'В наличии / Нет в наличии'))}
          </Section>

          <Section title="Изображения">
            {field('Главное фото (URL)', inp('image_url', 'https://...'))}
            {form.image_url && (
              <div style={{ marginTop: -12, marginBottom: 16 }}>
                <img src={form.image_url} alt="" style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'contain', background: '#131620' }} />
              </div>
            )}
            {!isNew && product?.images && (
              <div>
                <div style={{ color: '#555', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Все фото ({(product.images as string[]).length})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(product.images as string[]).map((img, i) => (
                    <img key={i} src={img} alt="" style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover', background: '#131620' }} />
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Ссылка">
            {field('URL на gorgia.ge', inp('source_url', 'https://gorgia.ge/ka/...'))}
            {!isNew && (
              <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>
                ID: {String(product?.id)} · external_id: {String(product?.external_id || '—')}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
