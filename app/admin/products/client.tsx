'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type Product = {
  id: number;
  external_id: string;
  category_key: string;
  name: string;
  name_en: string | null;
  name_ka: string | null;
  description_ru: string | null;
  description_en: string | null;
  description_ka: string | null;
  price: number | null;
  in_stock: boolean;
  category: string;
  image_url: string | null;
  updated_at: string;
};

type Category = { key: string; name: string };

type Filters = {
  search: string;
  inStock: string;
  filter: string;
  categoryKey: string;
};

const mono = "'DM Mono', 'Fira Mono', monospace";

function buildUrl(base: Filters, page: number, overrides: Partial<Filters & { page: number }> = {}) {
  const merged = { ...base, page: String(page), ...overrides };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
  return `/admin/products?${p}`;
}

export default function AdminProductsClient({
  products,
  categories,
  total,
  totalPages,
  currentPage,
  filters,
}: {
  products: Product[];
  categories: Category[];
  total: number;
  totalPages: number;
  currentPage: number;
  filters: Filters;
}) {
  const router = useRouter();
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [batchField, setBatchField]   = useState<'description' | 'name_en' | 'name_ka'>('description');
  const [provider, setProvider]       = useState<'opencode' | 'yandex'>('opencode');
  const [batchSize, setBatchSize]     = useState(10);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [imageEffect, setImageEffect] = useState<'product' | 'whitebg' | 'frame' | 'shadow' | 'mirror'>('product');
  const [imageTarget, setImageTarget] = useState<'main' | 'all'>('main');
  const [imageStatus, setImageStatus] = useState<string>('');
  const [imageRunning, setImageRunning] = useState(false);
  const [bulkStatus, setBulkStatus]   = useState<string>('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCategoryKey, setBulkCategoryKey] = useState<string>('');
  const [bulkSubKey, setBulkSubKey]   = useState<string>('');
  const [fullCategories, setFullCategories] = useState<
    { key: string; name: string; sub_categories: { key: string; name: string }[] }[]
  >([]);
  const [, startTransition] = useTransition();

  // Категории вместе с подкатегориями — тот же источник, что у формы редактирования товара
  useEffect(() => {
    fetch('/api/products/categories')
      .then(r => r.json())
      .then(data => setFullCategories(data.categories || []))
      .catch(console.error);
  }, []);

  const bulkSubOptions = fullCategories.find(c => c.key === bulkCategoryKey)?.sub_categories || [];

  // Безопасный парсинг ответа — не падаем на пустом/не-JSON теле (то самое "Unexpected end of JSON input")
  async function safeJson(res: Response): Promise<any> {
    const text = await res.text();
    if (!text) return { error: `Пустой ответ от сервера (HTTP ${res.status})` };
    try {
      return JSON.parse(text);
    } catch {
      return { error: `Не-JSON ответ (HTTP ${res.status}): ${text.slice(0, 200)}` };
    }
  }

  // ── Выбор ────────────────────────────────────────────────────────────────
  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.id)));
    }
  };

  // ── Batch translate ───────────────────────────────────────────────────────
  const runBatch = async () => {
    if (selected.size === 0) { setBatchStatus('Выберите товары'); return; }
    setBatchRunning(true);
    setBatchStatus(`Обрабатываю ${Math.min(selected.size, batchSize)} товаров…`);
    try {
      const res = await fetch('/api/admin/batch-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          field: batchField,
          provider,
          batch_size: batchSize,
        }),
      });
      const data = await res.json();
      setBatchStatus(`✓ Готово: ${data.ok} успешно, ${data.err} ошибок`);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      setBatchStatus(`✕ Ошибка: ${String(e)}`);
    } finally {
      setBatchRunning(false);
    }
  };

  const runImageBatch = async () => {
    if (selected.size === 0) { setImageStatus('Выберите товары'); return; }
    setImageRunning(true);
    setImageStatus(`Обрабатываю фото ${Math.min(selected.size, batchSize)} товаров…`);
    try {
      const res = await fetch('/api/admin/batch-process-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          effect: imageEffect,
          target: imageTarget,
          batch_size: batchSize,
        }),
      });
      const data = await res.json();
      setImageStatus(`✓ Готово: ${data.ok} успешно, ${data.err} ошибок`);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      setImageStatus(`✕ Ошибка: ${String(e)}`);
    } finally {
      setImageRunning(false);
    }
  };

  // ── Массовое удаление ───────────────────────────────────────────────────
  const bulkDelete = async () => {
    if (selected.size === 0) { setBulkStatus('Выберите товары'); return; }
    if (!confirm(`Удалить ${selected.size} товаров? Это необратимо.`)) return;

    setBulkRunning(true);
    setBulkStatus(`Удаляю ${selected.size} товаров…`);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: Array.from(selected) }),
      });
      const data = await safeJson(res);
      setBulkStatus(res.ok ? `✓ Удалено: ${data.deleted}` : `✕ Ошибка: ${data.error || data.details || 'неизвестная'}`);
      if (res.ok) { setSelected(new Set()); startTransition(() => router.refresh()); }
    } catch (e) {
      setBulkStatus(`✕ Ошибка сети: ${String(e)}`);
    } finally {
      setBulkRunning(false);
    }
  };

  // ── Массовая смена категории ────────────────────────────────────────────
  const bulkChangeCategory = async () => {
    if (selected.size === 0) { setBulkStatus('Выберите товары'); return; }
    if (!bulkCategoryKey) { setBulkStatus('Выберите категорию'); return; }

    const target = categories.find(c => c.key === bulkCategoryKey);
    if (!target) { setBulkStatus('Категория не найдена'); return; }
    const targetSub = bulkSubKey ? bulkSubOptions.find(s => s.key === bulkSubKey) : null;

    setBulkRunning(true);
    setBulkStatus(`Меняю категорию у ${selected.size} товаров…`);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          ids: Array.from(selected),
          fields: {
            category: target.name,
            category_key: target.key,
            ...(targetSub ? { sub_category: targetSub.name } : {}),
          },
        }),
      });
      const data = await safeJson(res);
      setBulkStatus(res.ok ? `✓ Обновлено: ${data.updated}` : `✕ Ошибка: ${data.error || data.details || 'неизвестная'}`);
      if (res.ok) { setSelected(new Set()); startTransition(() => router.refresh()); }
    } catch (e) {
      setBulkStatus(`✕ Ошибка сети: ${String(e)}`);
    } finally {
      setBulkRunning(false);
    }
  };

  // ── Инлайн перевод одного товара ─────────────────────────────────────────
  const [inlineLoading, setInlineLoading] = useState<number | null>(null);
  const translateOne = async (p: Product, field: 'description' | 'name_en' | 'name_ka') => {
    setInlineLoading(p.id);
    try {
      const mode = field === 'description' ? 'description' : 'name';
      const res = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_ru: p.name, name_en: p.name_en, name_ka: p.name_ka,
          category_ru: p.category, provider, mode,
        }),
      });
      const data = await res.json();
  
      await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          field === 'description'
            ? { description_ru: data.ru, description_en: data.en, description_ka: data.ka }
            : field === 'name_en'
            ? { name_en: data.en }
            : { name_ka: data.ka }
        ),
      });
      startTransition(() => router.refresh());
    } catch (e) {
      console.error(e);
    } finally {
      setInlineLoading(null);
    }
  };
  const cellStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12,
  };

  const missingBadge = (val: string | null) =>
    val
      ? <span style={{ color: '#4ade80', fontSize: 11 }}>✓</span>
      : <span style={{ color: '#f87171', fontSize: 11 }}>✗</span>;

  return (
    <div style={{ fontFamily: mono, minHeight: '100vh', background: '#0f1117', color: '#e2e4ec' }}>


      <div style={{ padding: '24px 32px', maxWidth: 1500, margin: '0 auto' }}>

        {/* Фильтры */}
        <form method="GET" action="/admin/products" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input name="search" defaultValue={filters.search} placeholder="Поиск по имени…"
            style={{ padding: '8px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 260, outline: 'none' }} />

          <select name="in_stock" defaultValue={filters.inStock}
            style={{ padding: '8px 12px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="">Все</option>
            <option value="true">В наличии</option>
            <option value="false">Нет в наличии</option>
          </select>

          <select name="filter" defaultValue={filters.filter}
            style={{ padding: '8px 12px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="">Без фильтра</option>
            <option value="no_photo">Без фото</option>
            <option value="no_name_en">Нет name_en</option>
            <option value="no_name_ka">Нет name_ka</option>
            <option value="no_desc_ru">Нет описания RU</option>
            <option value="no_desc_en">Нет описания EN</option>
            <option value="no_desc_ka">Нет описания KA</option>
          </select>

          <select name="category_key" defaultValue={filters.categoryKey}
            style={{ padding: '8px 12px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="">Все категории</option>
            {categories.map(c => <option key={c.key} value={c.key}>{c.name} [{c.key}]</option>)}
          </select>

          <button type="submit"
            style={{ padding: '8px 18px', background: '#c8f135', border: 'none', borderRadius: 8, color: '#0f1117', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Применить
          </button>
          {(filters.search || filters.inStock || filters.filter || filters.categoryKey) && (
            <Link href="/admin/products" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>✕ Сбросить</Link>
          )}
        </form>

        {/* Пакетные действия */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: 12, whiteSpace: 'nowrap' }}>
            Выбрано: <span style={{ color: selected.size > 0 ? '#c8f135' : '#555', fontWeight: 600 }}>{selected.size}</span>
          </span>

          <select value={batchField} onChange={e => setBatchField(e.target.value as any)}
            style={{ padding: '6px 10px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}>
            <option value="description">Заполнить описание</option>
            <option value="name_en">Заполнить name_en</option>
            <option value="name_ka">Заполнить name_ka</option>
          </select>

          <select value={provider} onChange={e => setProvider(e.target.value as any)}
            style={{ padding: '6px 10px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}>
            <option value="opencode">OpenCode Go</option>
            <option value="yandex">YandexGPT (fallback)</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#555', fontSize: 12 }}>Пачка:</span>
            <input type="number" value={batchSize} min={1} max={50} onChange={e => setBatchSize(Number(e.target.value))}
              style={{ width: 50, padding: '5px 8px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }} />
          </div>

          <button onClick={runBatch} disabled={batchRunning || selected.size === 0}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: batchRunning || selected.size === 0 ? 'not-allowed' : 'pointer',
              background: batchRunning ? '#333' : selected.size === 0 ? '#222' : '#c8f135',
              color: batchRunning || selected.size === 0 ? '#555' : '#0f1117',
              fontSize: 12, fontWeight: 600,
            }}>
            {batchRunning ? '⟳ Обрабатываю…' : '▶ Запустить пачкой'}
          </button>

          {batchStatus && (
            <span style={{ fontSize: 12, color: batchStatus.startsWith('✓') ? '#4ade80' : batchStatus.startsWith('✕') ? '#f87171' : '#aaa' }}>
              {batchStatus}
            </span>
          )}
        </div>

        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap', fontWeight: 600 }}>🖼 Обработка фото:</span>
 
          <select value={imageEffect} onChange={e => setImageEffect(e.target.value as any)}
            style={{ padding: '6px 10px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}>
            <option value="product">✨ Товарный вид (комбо)</option>
            <option value="whitebg">⬜ Белый фон</option>
            <option value="frame">🔲 Рамка с отступом</option>
            <option value="shadow">🌑 Тень</option>
            <option value="mirror">↔ Зеркало</option>
          </select>
 
          <select value={imageTarget} onChange={e => setImageTarget(e.target.value as any)}
            style={{ padding: '6px 10px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}>
            <option value="main">Только главное фото</option>
            <option value="all">Все фото товара</option>
          </select>
 
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#555', fontSize: 12 }}>Пачка:</span>
            <input type="number" value={batchSize} min={1} max={20} onChange={e => setBatchSize(Number(e.target.value))}
              style={{ width: 50, padding: '5px 8px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }} />
          </div>
 
          <button onClick={runImageBatch} disabled={imageRunning || selected.size === 0}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none',
              cursor: imageRunning || selected.size === 0 ? 'not-allowed' : 'pointer',
              background: imageRunning ? '#333' : selected.size === 0 ? '#222' : '#3b82f6',
              color: imageRunning || selected.size === 0 ? '#555' : '#fff',
              fontSize: 12, fontWeight: 600,
            }}>
            {imageRunning ? '⟳ Обрабатываю…' : '🖼 Обработать фото'}
          </button>
 
          {imageStatus && (
            <span style={{ fontSize: 12, color: imageStatus.startsWith('✓') ? '#4ade80' : imageStatus.startsWith('✕') ? '#f87171' : '#aaa' }}>
              {imageStatus}
            </span>
          )}
        </div>

        {/* Массовые операции */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #2a2d3a', marginTop: 10 }}>
          <span style={{ color: '#555', fontSize: 12 }}>
            Выбрано: <span style={{ color: selected.size > 0 ? '#c8f135' : '#555', fontWeight: 600 }}>{selected.size}</span>
          </span>

          <select value={bulkCategoryKey} onChange={e => { setBulkCategoryKey(e.target.value); setBulkSubKey(''); }}
            style={{ padding: '6px 10px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: '#fff', fontSize: 12, outline: 'none' }}>
            <option value="">Категория для смены…</option>
            {fullCategories.map(c => <option key={c.key} value={c.key}>{c.name} [{c.key}]</option>)}
          </select>

          <select value={bulkSubKey} onChange={e => setBulkSubKey(e.target.value)} disabled={!bulkCategoryKey}
            style={{ padding: '6px 10px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 7, color: bulkCategoryKey ? '#fff' : '#555', fontSize: 12, outline: 'none' }}>
            <option value="">Подкатегория (опционально)…</option>
            {bulkSubOptions.map(s => <option key={s.key} value={s.key}>{s.name} [{s.key}]</option>)}
          </select>

          <button onClick={bulkChangeCategory} disabled={bulkRunning || selected.size === 0 || !bulkCategoryKey}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none',
              cursor: bulkRunning || selected.size === 0 || !bulkCategoryKey ? 'not-allowed' : 'pointer',
              background: bulkRunning ? '#333' : (selected.size === 0 || !bulkCategoryKey) ? '#222' : '#3b82f6',
              color: bulkRunning || selected.size === 0 || !bulkCategoryKey ? '#555' : '#fff',
              fontSize: 12, fontWeight: 600,
            }}>
            {bulkRunning ? '⟳ Применяю…' : '↪ Применить категорию'}
          </button>

          <button onClick={bulkDelete} disabled={bulkRunning || selected.size === 0}
            style={{
              padding: '7px 16px', borderRadius: 7, border: '1px solid #5c1a1a',
              cursor: bulkRunning || selected.size === 0 ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: bulkRunning || selected.size === 0 ? '#555' : '#f87171',
              fontSize: 12, fontWeight: 600,
            }}>
            🗑 Удалить выбранные
          </button>

          {bulkStatus && (
            <span style={{ fontSize: 12, color: bulkStatus.startsWith('✓') ? '#4ade80' : bulkStatus.startsWith('✕') ? '#f87171' : '#aaa' }}>
              {bulkStatus}
            </span>
          )}
        </div>

        {/* Инфо строка */}
        <div style={{ color: '#555', fontSize: 12, marginBottom: 12 }}>
          Найдено: {total.toLocaleString()} товаров · стр. {currentPage} из {totalPages}
        </div>

        {/* Таблица */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                <th style={{ ...cellStyle, width: 36 }}>
                  <input type="checkbox"
                    checked={selected.size === products.length && products.length > 0}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer', accentColor: '#c8f135' }}
                  />
                </th>
                {['Фото', 'Название', 'Категория', 'Переводы', 'Описание', 'Цена', 'Наличие', 'Обновлено', ''].map((h, i) => (
                  <th key={i} style={{ ...cellStyle, color: '#555', textAlign: 'left', fontWeight: 500, letterSpacing: '0.05em', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}
                  style={{ borderBottom: '1px solid #1e2130', background: selected.has(p.id) ? '#1a2a0e' : 'transparent', transition: 'background 0.15s' }}>

                  {/* Чекбокс */}
                  <td style={cellStyle}>
                    <input type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      style={{ cursor: 'pointer', accentColor: '#c8f135' }}
                    />
                  </td>

                  {/* Фото */}
                  <td style={{ ...cellStyle, width: 52 }}>
                    {p.image_url
                      ? <img src={p.image_url} alt="" width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', background: '#222' }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 18 }}>□</div>
                    }
                  </td>

                  {/* Название */}
                  <td style={{ ...cellStyle, maxWidth: 280 }}>
                    <div style={{ color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ color: '#444', fontSize: 10, marginTop: 2 }}>{p.external_id}</div>
                  </td>

                  {/* Категория */}
                  <td style={{ ...cellStyle, color: '#666', whiteSpace: 'nowrap' }}>
                    <div>{p.category || '—'}</div>
                    <div style={{ color: '#444', fontSize: 10 }}>[{p.category_key}]</div>
                  </td>

                  {/* Переводы названия */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: '#555', fontSize: 10 }}>EN</span>{missingBadge(p.name_en)}
                      <span style={{ color: '#555', fontSize: 10 }}>KA</span>{missingBadge(p.name_ka)}
                    </div>
                    {(!p.name_en || !p.name_ka) && (
                      <button
                        onClick={() => translateOne(p, !p.name_en ? 'name_en' : 'name_ka')}
                        disabled={inlineLoading === p.id}
                        style={{ marginTop: 4, padding: '2px 7px', fontSize: 10, background: '#1e2a0e', border: '1px solid #2a3a0a', borderRadius: 4, color: '#c8f135', cursor: 'pointer' }}>
                        {inlineLoading === p.id ? '⟳' : '+ перевести'}
                      </button>
                    )}
                  </td>

                  {/* Описание */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: '#555', fontSize: 10 }}>RU</span>{missingBadge(p.description_ru)}
                      <span style={{ color: '#555', fontSize: 10 }}>EN</span>{missingBadge(p.description_en)}
                      <span style={{ color: '#555', fontSize: 10 }}>KA</span>{missingBadge(p.description_ka)}
                    </div>
                    {(!p.description_ru || !p.description_en || !p.description_ka) && (
                      <button
                        onClick={() => translateOne(p, 'description')}
                        disabled={inlineLoading === p.id}
                        style={{ marginTop: 4, padding: '2px 7px', fontSize: 10, background: '#1e2a0e', border: '1px solid #2a3a0a', borderRadius: 4, color: '#c8f135', cursor: 'pointer' }}>
                        {inlineLoading === p.id ? '⟳' : '+ сгенерировать'}
                      </button>
                    )}
                  </td>

                  {/* Цена */}
                  <td style={{ ...cellStyle, color: '#ccc', whiteSpace: 'nowrap' }}>
                    {p.price ? `${Number(p.price).toFixed(0)} ₾` : '—'}
                  </td>

                  {/* Наличие */}
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 500,
                      background: p.in_stock ? '#1a3a1a' : '#2a1a1a',
                      color: p.in_stock ? '#4ade80' : '#f87171',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                      {p.in_stock ? 'есть' : 'нет'}
                    </span>
                  </td>

                  {/* Обновлено */}
                  <td style={{ ...cellStyle, color: '#444', whiteSpace: 'nowrap' }}>
                    {new Date(p.updated_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>

                  {/* Изменить */}
                  <td style={cellStyle}>
                    <Link href={`/admin/products/${p.id}`}
                      style={{ color: '#c8f135', fontSize: 11, textDecoration: 'none', padding: '3px 9px', border: '1px solid #2a3a0a', borderRadius: 6, whiteSpace: 'nowrap' }}>
                      Изменить
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center', alignItems: 'center' }}>
            {currentPage > 1 && (
              <Link href={buildUrl(filters, currentPage - 1)}
                style={{ padding: '6px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#ccc', textDecoration: 'none', fontSize: 13 }}>
                ← Назад
              </Link>
            )}
            <span style={{ color: '#666', fontSize: 13 }}>стр. {currentPage} / {totalPages}</span>
            {currentPage < totalPages && (
              <Link href={buildUrl(filters, currentPage + 1)}
                style={{ padding: '6px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#ccc', textDecoration: 'none', fontSize: 13 }}>
                Вперёд →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}