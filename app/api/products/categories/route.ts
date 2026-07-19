// FILE: app/api/products/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const rows = await sql`
      SELECT
        c.category_key,
        c.name                  AS category,
        c.name_en               AS category_en,
        c.name_ka               AS category_ka,
        c.category_image,
        cat_cnt.total           AS category_total,

        s.key                   AS sub_key,
        s.name                  AS sub_name,
        s.name_en               AS sub_name_en,
        s.name_ka               AS sub_name_ka,
        s.image_url             AS sub_image_url,
        sub_cnt.total           AS sub_total
      FROM categories c

      -- Итог по категории целиком — считается один раз на категорию,
      -- НЕ зависит от подкатегорий (раньше сюда случайно попадал count
      -- первой попавшейся подкатегории).
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM products p
        WHERE p.source = 'gorgia'
          AND p.image_url IS NOT NULL
          AND p.category_key = c.category_key
      ) cat_cnt ON true

      LEFT JOIN subcategories s ON s.category_key = c.category_key

      -- Итог по конкретной подкатегории — точное совпадение по имени,
      -- БЕЗ "OR sub_category IS NULL" (раньше это раздувало каждую
      -- подкатегорию на одинаковое число товаров без подкатегории вообще).
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM products p
        WHERE p.source = 'gorgia'
          AND p.image_url IS NOT NULL
          AND p.category_key = c.category_key
          AND p.sub_category = s.name
      ) sub_cnt ON s.key IS NOT NULL

      ORDER BY c.name, s.name
    `;

    const map = new Map<string, any>();
    for (const row of rows) {
      const key = row.category_key as string;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name:           row.category,
          name_en:        row.category_en,
          name_ka:        row.category_ka,
          image_url:      row.category_image,
          total:          Number(row.category_total ?? 0),
          sub_categories: [],
        });
      }
      const entry = map.get(key)!;
      if (row.sub_key) {
        entry.sub_categories.push({
          key:       row.sub_key,
          name:      row.sub_name,
          name_en:   row.sub_name_en,
          name_ka:   row.sub_name_ka,
          image_url: row.sub_image_url,
          count:     Number(row.sub_total ?? 0),
        });
      }
    }

    return NextResponse.json(
      { categories: Array.from(map.values()) },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } }
    );
  } catch (err) {
    console.error('GET /api/products/categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}