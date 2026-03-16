import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const body = await req.json();

  const {
    external_id,
    name_ru, name_en, name_ka,
    description_ru, description_en, description_ka,
    sku, price, in_stock,
    availability_ru, availability_ka,
    category_ru, category_en, category_ka,
    sub_category_ru, sub_category_en, sub_category_ka,
    image_url, source_url, images,
  } = body;

  const imagesArray = Array.isArray(images) ? images : (image_url ? [image_url] : []);

  // category_key: из external_id если есть, иначе из category_ru
  const category_key = external_id
    ? external_id.split('_')[0]
    : (category_ru || '').toLowerCase().replace(/\s+/g, '-') || null;

  const rows = await sql`
    INSERT INTO products (
      source, external_id, category_key,
      name, name_ru, name_en, name_ka,
      description, description_ru, description_en, description_ka,
      sku, price, in_stock,
      availability_ru, availability_ka,
      category, category_ru, category_en, category_ka,
      sub_category, sub_category_ru, sub_category_en, sub_category_ka,
      image_url, images, source_url
    ) VALUES (
      'gorgia', ${external_id || null}, ${category_key},
      ${name_ru || null}, ${name_ru || null}, ${name_en || null}, ${name_ka || null},
      ${description_ru || null}, ${description_ru || null}, ${description_en || null}, ${description_ka || null},
      ${sku || null},
      ${price ? parseFloat(price) : null},
      ${Boolean(in_stock)},
      ${availability_ru || null}, ${availability_ka || null},
      ${category_ru || null}, ${category_ru || null}, ${category_en || null}, ${category_ka || null},
      ${sub_category_ru || null}, ${sub_category_ru || null}, ${sub_category_en || null}, ${sub_category_ka || null},
      ${image_url || null},
      ${JSON.stringify(imagesArray)}::jsonb,
      ${source_url || null}
    )
    RETURNING id
  `;

  return NextResponse.json({ ok: true, id: rows[0].id });
}