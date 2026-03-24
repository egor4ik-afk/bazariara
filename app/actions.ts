
'use server';

import { unstable_cache } from 'next/cache';
import sql from '@/lib/db';
import { Product, Category } from '@/lib/types';

type Row = Record<string, unknown>;

export const getCategories = unstable_cache(
  async () => {
    const catRows = await sql`
      SELECT
        p.key,
        p.name,
        p.name_en,
        p.name_ka,
        COALESCE(c.category_image, p.image_url) AS image_url
      FROM (
        SELECT
          category_key     AS key,
          MAX(category)    AS name,
          MAX(category_en) AS name_en,
          MAX(category_ka) AS name_ka,
          MIN(image_url)   AS image_url
        FROM products
        WHERE source = 'gorgia'
          AND image_url IS NOT NULL
          AND category IS NOT NULL
          AND category_key IS NOT NULL
        GROUP BY category_key
      ) p
      LEFT JOIN categories c ON c.category_key = p.key
      ORDER BY p.name
    `;
    return (catRows as Row[]).map((r) => ({
      key:      r.key as string,
      name:     r.name as string,
      name_en:  (r.name_en as string) || null,
      name_ka:  (r.name_ka as string) || null,
      imageUrl: (r.image_url as string) ?? '',
    }));
  },
  ['categories-list'],
  { revalidate: 600 }
);

export const getSubCategories = unstable_cache(
  async (category: string) => {
    if (category === 'all') return [];
    const subRows = await sql`
      SELECT
        LOWER(REPLACE(COALESCE(sub_category, ''), ' ', '-')) AS key,
        MAX(sub_category)     AS name,
        MAX(sub_category_en)  AS name_en,
        MAX(sub_category_ka)  AS name_ka,
        MIN(image_url)        AS image_url
      FROM products
      WHERE source = 'gorgia'
        AND image_url IS NOT NULL
        AND category_key = ${category}
        AND sub_category IS NOT NULL
      GROUP BY LOWER(REPLACE(COALESCE(sub_category, ''), ' ', '-'))
      ORDER BY MAX(sub_category)
    `;
    return (subRows as Row[]).map((r) => ({
      key:      r.key as string,
      name:     r.name as string,
      name_en:  (r.name_en as string) ?? null,
      name_ka:  (r.name_ka as string) ?? null,
      imageUrl: (r.image_url as string) ?? '',
    }));
  },
  ['sub-categories-list'],
  { revalidate: 600 }
);

export const getProducts = unstable_cache(
  async (category: string, sub: string, search: string, page: number) => {
    const ITEMS_PER_PAGE = 20;
    const offset = (page - 1) * ITEMS_PER_PAGE;

    const categoryFilter = category !== 'all'
      ? sql`AND category_key = ${category}`
      : sql``;

    const subcategoryFilter = sub !== 'all'
      ? sql`AND LOWER(REPLACE(COALESCE(sub_category, ''), ' ', '-')) = ${sub.toLowerCase()}`
      : sql``;

    const searchFilter = search.length >= 2
      ? sql`AND (name_ru ILIKE ${'%' + search + '%'} OR name ILIKE ${'%' + search + '%'})`
      : sql``;

    const [countRows, productRows] = await Promise.all([
      sql`
        SELECT COUNT(*) AS total
        FROM products
        WHERE source = 'gorgia'
          AND image_url IS NOT NULL
          ${categoryFilter}
          ${subcategoryFilter}
          ${searchFilter}
      `,
      sql`
        SELECT
          id, external_id, category_key, source_url, gorgia_url,
          COALESCE(name_ru, name) AS name,
          name_ru, name_en, name_ka,
          description_ru AS description,
          price, currency, in_stock, availability,
          category, category_en, category_ka,
          sub_category, sub_category_en, sub_category_ka,
          image_url, images
        FROM products
        WHERE source = 'gorgia'
          AND image_url IS NOT NULL
          ${categoryFilter}
          ${subcategoryFilter}
          ${searchFilter}
        ORDER BY in_stock DESC, updated_at DESC
        LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
      `,
    ]);

    const total = parseInt(countRows[0].total as string);
    const products = productRows as unknown as Product[];

    return { products, total };
  },
  ['products-list'],
  { revalidate: 600 }
);
