import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get('page') || '1');
  const per = Math.min(100, parseInt(sp.get('per_page') || '40'));
  const offset = (page - 1) * per;

  const rows = await sql`
    SELECT id, external_id, COALESCE(name_ru, name) AS name, sku, price, in_stock,
           COALESCE(category_ru, category) AS category, image_url, updated_at
    FROM products
    WHERE source = 'gorgia'
    ORDER BY updated_at DESC
    LIMIT ${per} OFFSET ${offset}
  `;

  const [count] = await sql`SELECT COUNT(*) AS total FROM products WHERE source = 'gorgia'`;

  return NextResponse.json({ products: rows, total: Number(count.total), page, per_page: per });
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const body = await req.json();
  const {
    name_ru, name_en, name_ka,
    description_ru, description_en, description_ka,
    sku, price, in_stock,
    availability_ru, availability_ka,
    category_ru, category_en, category_ka,
    sub_category_ru, sub_category_en, sub_category_ka,
    image_url, source_url,
  } = body;

  // Generate stable external_id from URL or timestamp
  const external_id = source_url
    ? `manual_${source_url.split('/').filter(Boolean).slice(-2).join('_')}_${Date.now().toString(36)}`
    : `manual_${Date.now().toString(36)}`;

  const rows = await sql`
    INSERT INTO products (
      external_id, source, source_url,
      name, name_ru, name_en, name_ka,
      description, description_ru, description_en, description_ka,
      availability_ru, availability_ka,
      category, category_ru, category_en, category_ka,
      sub_category, sub_category_ru, sub_category_en, sub_category_ka,
      sku, price, currency, in_stock,
      image_url, images
    ) VALUES (
      ${external_id}, 'gorgia', ${source_url || null},
      ${name_ru || name_ka || ''}, ${name_ru || null}, ${name_en || null}, ${name_ka || null},
      ${description_ru || description_ka || null}, ${description_ru || null}, ${description_en || null}, ${description_ka || null},
      ${availability_ru || null}, ${availability_ka || null},
      ${category_ru || null}, ${category_ru || null}, ${category_en || null}, ${category_ka || null},
      ${sub_category_ru || null}, ${sub_category_ru || null}, ${sub_category_en || null}, ${sub_category_ka || null},
      ${sku || null}, ${price ? parseFloat(price) : null}, 'GEL', ${Boolean(in_stock)},
      ${image_url || null}, '[]'
    )
    RETURNING id, external_id
  `;

  return NextResponse.json({ id: rows[0].id, external_id: rows[0].external_id }, { status: 201 });
}
