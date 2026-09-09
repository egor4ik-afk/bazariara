import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const body = await req.json();

  const {
    external_id, name_ru, name_en, name_ka,
    description_ru, description_en, description_ka,
    sku, price, in_stock,
    availability,
    category_key: category_key_in,
    category, category_en, category_ka,
    sub_category, sub_category_en, sub_category_ka,
    farmer_slug, farmer_name,
    image_url, source_url, images,
  } = body;

  const imagesArray = Array.isArray(images) ? images : (image_url ? [image_url] : []);

  const category_key =
    (category_key_in || '').trim() ||
    (external_id && external_id.includes('_') ? external_id.split('_')[0] : null);

  if (!category_key) {
    return NextResponse.json(
      { error: 'category_key обязателен — выберите категорию из списка' },
      { status: 400 }
    );
  }

  const cat = await sql`
    SELECT name, name_en, name_ka FROM categories WHERE category_key = ${category_key} LIMIT 1
  `;
  if (cat.length === 0) {
    return NextResponse.json(
      { error: `Категория '${category_key}' не найдена. Создайте её сначала.` },
      { status: 400 }
    );
  }

  const catRu = category    || cat[0].name;
  const catEn = category_en || cat[0].name_en;
  const catKa = category_ka || cat[0].name_ka;

  const rows = await sql`
    INSERT INTO products (
      source, external_id, category_key, currency,
      name, name_ru, name_en, name_ka,
      description, description_ru, description_en, description_ka,
      sku, price, in_stock,
      availability,
      category, category_en, category_ka,
      sub_category, sub_category_en, sub_category_ka,
      farmer_slug, farmer_name,
      image_url, images, source_url
    ) VALUES (
      'gorgia', ${external_id || null}, ${category_key}, 'GEL',
      ${name_ru || null}, ${name_ru || null}, ${name_en || null}, ${name_ka || null},
      ${description_ru || null}, ${description_ru || null}, ${description_en || null}, ${description_ka || null},
      ${sku || null},
      ${price ? parseFloat(price) : null},
      ${Boolean(in_stock)},
      ${availability || null},
      ${catRu}, ${catEn}, ${catKa},
      ${sub_category || null}, ${sub_category_en || null}, ${sub_category_ka || null},
      ${(farmer_slug || '').trim() || null}, ${(farmer_name || '').trim() || null},
      ${image_url || null},
      ${JSON.stringify(imagesArray)}::jsonb,
      ${source_url || null}
    )
    RETURNING id
  `;

  if (sub_category) {
    const subKey = sub_category.trim().toLowerCase().replace(/\s+/g, '-');
    await sql`
      INSERT INTO subcategories (category_key, key, name, name_en, name_ka, image_url)
      VALUES (${category_key}, ${subKey}, ${sub_category},
              ${sub_category_en || null}, ${sub_category_ka || null}, ${image_url || null})
      ON CONFLICT (key) DO NOTHING
    `;
  }

  return NextResponse.json({ ok: true, id: rows[0].id });
}
