
'use server';

import { unstable_cache } from 'next/cache';
import sql from '@/lib/db';
import { Product, Category } from '@/lib/types';

type Row = Record<string, unknown>;

export const getCategories = unstable_cache(
  async () => {
    const catRows = await sql`
      SELECT category_key AS key, name, name_en, name_ka, category_image AS image_url
      FROM categories
      ORDER BY name
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
      SELECT key, name, name_en, name_ka, image_url
      FROM subcategories
      WHERE category_key = ${category}
      ORDER BY name
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
          COALESCE(description_ru, description_en, description_ka) AS description,
          description_ru, description_en, description_ka,
          price, currency, in_stock, availability,
          category, category_en, category_ka,
          sub_category, sub_category_en, sub_category_ka,
          farmer_slug, farmer_name,
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
