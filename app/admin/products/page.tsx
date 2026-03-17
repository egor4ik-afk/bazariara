import sql from '@/lib/db';
import Link from 'next/link';
import AdminProductsClient from './client';
import type { Product } from './client';
export const revalidate = 0;

type SP = Promise<{ [k: string]: string | undefined }>;
type Row = Record<string, unknown>;

const PER_PAGE = 40;

export default async function AdminProductsPage({ searchParams }: { searchParams: SP }) {
  const params      = await searchParams;
  const search      = params.search || '';
  const inStock     = params.in_stock || '';
  const filter      = params.filter || '';
  const categoryKey = params.category_key || '';
  const page        = parseInt(params.page || '1');
  const offset      = (page - 1) * PER_PAGE;

  const searchPat = `%${search}%`;

  const [countRows, rows, catRows] = await Promise.all([
    sql`SELECT COUNT(*) AS total
        FROM products
        WHERE source = 'gorgia'
        AND (${search} = '' OR name_ru ILIKE ${searchPat} OR name ILIKE ${searchPat} OR external_id ILIKE ${searchPat})
        AND (${inStock} = '' OR in_stock = (${inStock} = 'true'))
        AND (${filter} != 'no_photo'      OR image_url IS NULL OR image_url = '')
        AND (${filter} != 'no_name_en'    OR name_en IS NULL OR name_en = '')
        AND (${filter} != 'no_name_ka'    OR name_ka IS NULL OR name_ka = '')
        AND (${filter} != 'no_desc_ru'    OR description_ru IS NULL OR description_ru = '')
        AND (${filter} != 'no_desc_en'    OR description_en IS NULL OR description_en = '')
        AND (${filter} != 'no_desc_ka'    OR description_ka IS NULL OR description_ka = '')
        AND (${categoryKey} = '' OR category_key = ${categoryKey})`,

    sql`SELECT id, external_id, category_key,
               COALESCE(name_ru, name) AS name,
               name_en, name_ka,
               description_ru, description_en, description_ka,
               price, in_stock,
               COALESCE(category_ru, category) AS category,
               image_url, updated_at
        FROM products
        WHERE source = 'gorgia'
        AND (${search} = '' OR name_ru ILIKE ${searchPat} OR name ILIKE ${searchPat} OR external_id ILIKE ${searchPat})
        AND (${inStock} = '' OR in_stock = (${inStock} = 'true'))
        AND (${filter} != 'no_photo'      OR image_url IS NULL OR image_url = '')
        AND (${filter} != 'no_name_en'    OR name_en IS NULL OR name_en = '')
        AND (${filter} != 'no_name_ka'    OR name_ka IS NULL OR name_ka = '')
        AND (${filter} != 'no_desc_ru'    OR description_ru IS NULL OR description_ru = '')
        AND (${filter} != 'no_desc_en'    OR description_en IS NULL OR description_en = '')
        AND (${filter} != 'no_desc_ka'    OR description_ka IS NULL OR description_ka = '')
        AND (${categoryKey} = '' OR category_key = ${categoryKey})
        ORDER BY updated_at DESC
        LIMIT ${PER_PAGE} OFFSET ${offset}`,

    sql`SELECT DISTINCT category_key, COALESCE(MAX(category_ru), MAX(category)) AS cat_name
        FROM products
        WHERE source = 'gorgia' AND category_key IS NOT NULL
        GROUP BY category_key
        ORDER BY cat_name`,
  ]);

  const total      = Number(countRows[0].total);
  const totalPages = Math.ceil(total / PER_PAGE);
  const categories = (catRows as Row[]).map(r => ({ key: r.category_key as string, name: r.cat_name as string })).filter(c => c.key);
  const products = rows as unknown as Product[];
  return (
    <AdminProductsClient
      products={products}
      categories={categories}
      total={total}
      totalPages={totalPages}
      currentPage={page}
      filters={{ search, inStock, filter, categoryKey }}
    />
  );
}