import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const p            = req.nextUrl.searchParams;
  const lang         = (p.get('lang') || 'ru') as 'ru' | 'en' | 'ka';
  const page         = Math.max(1, parseInt(p.get('page') || '1'));
  const perPage      = Math.min(100, Math.max(1, parseInt(p.get('per_page') || '20')));
  const offset       = (page - 1) * perPage;
  const category     = p.get('category');
  const subcat       = p.get('subcategory');
  const search       = p.get('search')?.trim();
  const inStockParam = p.get('in_stock');

  const nameField = lang === 'ka' ? sql`name_ka` : lang === 'en' ? sql`name_en` : sql`name_ru`;
  const descField = lang === 'ka' ? sql`description_ka` : lang === 'en' ? sql`description_en` : sql`description_ru`;

  const categoryFilter = category && category !== 'all'
    ? sql`AND category_key = ${category}`
    : sql``;
  const subcatFilter = subcat && subcat !== 'all'
    ? sql`AND LOWER(REPLACE(COALESCE(sub_category, ''), ' ', '-')) = ${subcat.toLowerCase()}`
    : sql``;
  const searchFilter = search && search.length >= 2
    ? sql`AND (name_ru ILIKE ${'%' + search + '%'} OR name ILIKE ${'%' + search + '%'})`
    : sql``;
  const inStockFilter = inStockParam !== null
    ? sql`AND in_stock = ${inStockParam === 'true'}`
    : sql``;

  try {
    const [countRows, rows] = await Promise.all([
      sql`
        SELECT COUNT(*) AS total FROM products
        WHERE source = 'gorgia' AND image_url IS NOT NULL
          ${categoryFilter} ${subcatFilter} ${searchFilter} ${inStockFilter}
      `,
      sql`
        SELECT
          id, external_id, category_key, source_url,
          COALESCE(${nameField}, name) AS name,
          name_ru, name_en, name_ka,
          COALESCE(${descField}, description) AS description,
          price, currency, in_stock, availability,
          category, category_en, category_ka,
          sub_category, sub_category_en, sub_category_ka,
          image_url, images, updated_at
        FROM products
        WHERE source = 'gorgia' AND image_url IS NOT NULL
          ${categoryFilter} ${subcatFilter} ${searchFilter} ${inStockFilter}
        ORDER BY in_stock DESC, updated_at DESC
        LIMIT ${perPage} OFFSET ${offset}
      `,
    ]);

    const total = parseInt(countRows[0].total as string);
    return NextResponse.json({
      products: rows,
      total,
      page,
      per_page: perPage,
      pages: Math.ceil(total / perPage),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('GET /api/products:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}