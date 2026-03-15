import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';



export async function GET(_req: NextRequest) {
  try {
    const rows = await sql`
      SELECT
        SPLIT_PART(external_id, '_', 1) AS category_key,
        category,
        category_en,
        sub_category,
        sub_category_en,
        MIN(image_url) AS image_url,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE in_stock = true) AS in_stock_count
      FROM products
      WHERE source = 'gorgia'
        AND image_url IS NOT NULL
        AND category IS NOT NULL
      GROUP BY
        SPLIT_PART(external_id, '_', 1),
        category, category_en,
        sub_category, sub_category_en
      ORDER BY category, sub_category
    `;

    const map = new Map<string, {
      key: string;
      name: string;
      name_en: string | null;
      image_url: string | null;
      total: number;
      sub_categories: { key: string; name: string; name_en: string | null; image_url: string | null }[];
    }>();

    for (const row of rows) {
      const key = row.category_key as string;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name:           row.category as string,
          name_en:        row.category_en as string | null,
          image_url:      row.image_url as string | null,
          total:          0,
          sub_categories: [],
        });
      }
      const entry = map.get(key)!;
      entry.total += parseInt(row.total as string);

      if (row.sub_category) {
        const subKey = (row.sub_category as string).toLowerCase().replace(/\s+/g, '-');
        entry.sub_categories.push({
          key:      subKey,
          name:     row.sub_category as string,
          name_en:  row.sub_category_en as string | null,
          image_url: row.image_url as string | null,
        });
      }
    }

    return NextResponse.json({
      categories: Array.from(map.values()),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
    });
  } catch (err) {
    console.error('GET /api/products/categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}