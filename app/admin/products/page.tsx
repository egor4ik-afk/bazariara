import sql from '@/lib/db';
import Link from 'next/link';

export const revalidate = 0;

type SP = Promise<{ [k: string]: string | undefined }>;
type Row = Record<string, unknown>;

const PER_PAGE = 40;

export default async function AdminProductsPage({ searchParams }: { searchParams: SP }) {
  const params = await searchParams;
  const search   = params.search || '';
  const inStock  = params.in_stock;
  const filter   = params.filter || '';
  const category = params.category || '';
  const page     = parseInt(params.page || '1');
  const offset   = (page - 1) * PER_PAGE;

  // Собираем все запросы с явными условиями — без sql.raw
  const inStockBool = inStock === 'true' ? true : inStock === 'false' ? false : null;

  const [countRows, rows, catRows] = await Promise.all([
    sql`SELECT COUNT(*) AS total FROM products
        WHERE source = 'gorgia'
        AND (${search} = '' OR name_ru ILIKE ${'%' + search + '%'} OR name ILIKE ${'%' + search + '%'} OR sku ILIKE ${'%' + search + '%'} OR external_id ILIKE ${'%' + search + '%'})
        AND (${inStockBool}::boolean IS NULL OR in_stock = ${inStockBool}::boolean)
        AND (${filter} != 'no_photo' OR image_url IS NULL OR image_url = '')
        AND (${filter} != 'no_sku' OR sku IS NULL OR sku = '')
        AND (${category} = '' OR COALESCE(category_ru, category) ILIKE ${'%' + category + '%'})`,

    sql`SELECT id, external_id, COALESCE(name_ru, name) AS name, sku, price, in_stock,
               COALESCE(category_ru, category) AS category, image_url, updated_at
        FROM products
        WHERE source = 'gorgia'
        AND (${search} = '' OR name_ru ILIKE ${'%' + search + '%'} OR name ILIKE ${'%' + search + '%'} OR sku ILIKE ${'%' + search + '%'} OR external_id ILIKE ${'%' + search + '%'})
        AND (${inStockBool}::boolean IS NULL OR in_stock = ${inStockBool}::boolean)
        AND (${filter} != 'no_photo' OR image_url IS NULL OR image_url = '')
        AND (${filter} != 'no_sku' OR sku IS NULL OR sku = '')
        AND (${category} = '' OR COALESCE(category_ru, category) ILIKE ${'%' + category + '%'})
        ORDER BY updated_at DESC
        LIMIT ${PER_PAGE} OFFSET ${offset}`,

    sql`SELECT DISTINCT COALESCE(category_ru, category) AS cat
        FROM products WHERE source = 'gorgia' AND category IS NOT NULL ORDER BY 1`,
  ]);

  const total = Number(countRows[0].total);
  const totalPages = Math.ceil(total / PER_PAGE);
  const categories = (catRows as Row[]).map(r => r.cat as string).filter(Boolean);
  const products = rows as Row[];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const base = { search, in_stock: inStock, filter, category, page: String(page) };
    const merged = { ...base, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/products?${p}`;
  }

  const mono = "'DM Mono', 'Fira Mono', monospace";

  return (
    <div style={{ fontFamily: mono, minHeight: '100vh', background: '#0f1117', color: '#e2e4ec' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2d3a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#c8f135', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>bazariara.ge admin</span>
        </div>
        <nav style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin" style={{ color: '#aaa', fontSize: 13, padding: '6px 12px', borderRadius: 6, textDecoration: 'none' }}>Дашборд</Link>
          <Link href="/admin/products" style={{ color: '#c8f135', fontSize: 13, padding: '6px 12px', borderRadius: 6, background: '#1e2a0e', textDecoration: 'none' }}>Товары</Link>
          <Link href="/admin/products/new" style={{ color: '#0f1117', fontSize: 13, padding: '6px 14px', borderRadius: 6, background: '#c8f135', textDecoration: 'none', fontWeight: 600 }}>+ Добавить</Link>
        </nav>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Filters */}
        <form method="GET" action="/admin/products" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input name="search" defaultValue={search} placeholder="Поиск по имени, SKU..."
            style={{ padding: '8px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 280, outline: 'none' }}
          />
          <select name="in_stock" defaultValue={inStock || ''} style={{ padding: '8px 12px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="">Все</option>
            <option value="true">В наличии</option>
            <option value="false">Нет в наличии</option>
          </select>
          <select name="filter" defaultValue={filter} style={{ padding: '8px 12px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="">Без фильтра</option>
            <option value="no_photo">Без фото</option>
            <option value="no_sku">Без SKU</option>
          </select>
          <select name="category" defaultValue={category} style={{ padding: '8px 12px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}>
            <option value="">Все категории</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" style={{ padding: '8px 18px', background: '#c8f135', border: 'none', borderRadius: 8, color: '#0f1117', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Применить
          </button>
          {(search || inStock || filter || category) && (
            <Link href="/admin/products" style={{ color: '#666', fontSize: 13, textDecoration: 'none' }}>✕ Сбросить</Link>
          )}
        </form>

        {/* Count */}
        <div style={{ color: '#555', fontSize: 12, marginBottom: 12 }}>
          Найдено: {total.toLocaleString()} товаров · стр. {page} из {totalPages}
        </div>

        {/* Table */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                {['Фото', 'Название / SKU', 'Категория', 'Цена', 'Наличие', 'Обновлено', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', color: '#555', textAlign: 'left', fontWeight: 500, letterSpacing: '0.05em', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id as number} style={{ borderBottom: '1px solid #1e2130', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e2130')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px', width: 52 }}>
                    {p.image_url ? (
                      <img src={p.image_url as string} alt="" width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', background: '#222' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 6, background: '#2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 18 }}>□</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', maxWidth: 320 }}>
                    <div style={{ color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name as string}</div>
                    <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{p.sku as string || <span style={{ color: '#3a3a3a' }}>нет SKU</span>}</div>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#888', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.category as string || '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#ccc', whiteSpace: 'nowrap' }}>{p.price ? `${Number(p.price).toFixed(0)} ₾` : '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: p.in_stock ? '#1a3a1a' : '#2a1a1a', color: p.in_stock ? '#4ade80' : '#f87171' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {p.in_stock ? 'в наличии' : 'нет'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#444', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(p.updated_at as string).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <Link href={`/admin/products/${p.id}`} style={{ color: '#c8f135', fontSize: 12, textDecoration: 'none', padding: '4px 10px', border: '1px solid #2a3a0a', borderRadius: 6 }}>
                      Изменить
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center', alignItems: 'center' }}>
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: '6px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#ccc', textDecoration: 'none', fontSize: 13 }}>← Назад</Link>}
            <span style={{ color: '#666', fontSize: 13 }}>стр. {page} / {totalPages}</span>
            {page < totalPages && <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: '6px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#ccc', textDecoration: 'none', fontSize: 13 }}>Вперёд →</Link>}
          </div>
        )}
      </div>
    </div>
  );
}