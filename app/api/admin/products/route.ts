import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const { id } = await params;
  const body = await req.json();

  const {
    name_ru, name_en, name_ka,
    description_ru, description_en, description_ka,
    sku, price, in_stock,
    availability_ru, availability_ka,
    category_ru, category_en, category_ka,
    sub_category_ru, sub_category_en, sub_category_ka,
    image_url, source_url,
    images, // ✅ ФИКС: было забыто в деструктуризации
  } = body;

  // ✅ Гарантируем что images — массив перед сохранением
  const imagesArray = Array.isArray(images) ? images : (image_url ? [image_url] : []);

  await sql`
    UPDATE products SET
      name            = COALESCE(${name_ru || null}, name),
      name_ru         = ${name_ru || null},
      name_en         = ${name_en || null},
      name_ka         = ${name_ka || null},
      description     = ${description_ru || description_ka || null},
      description_ru  = ${description_ru || null},
      description_en  = ${description_en || null},
      description_ka  = ${description_ka || null},
      sku             = ${sku || null},
      price           = ${price ? parseFloat(price) : null},
      in_stock        = ${Boolean(in_stock)},
      availability_ru = ${availability_ru || null},
      availability_ka = ${availability_ka || null},
      category        = COALESCE(${category_ru || null}, category),
      category_ru     = ${category_ru || null},
      category_en     = ${category_en || null},
      category_ka     = ${category_ka || null},
      sub_category    = COALESCE(${sub_category_ru || null}, sub_category),
      sub_category_ru = ${sub_category_ru || null},
      sub_category_en = ${sub_category_en || null},
      sub_category_ka = ${sub_category_ka || null},
      images          = ${JSON.stringify(imagesArray)}::jsonb,
      image_url       = ${image_url || null},
      source_url      = COALESCE(${source_url || null}, source_url),
      updated_at      = NOW()
    WHERE id = ${parseInt(id)} AND source = 'gorgia'
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const { id } = await params;
  await sql`DELETE FROM products WHERE id = ${parseInt(id)} AND source = 'gorgia'`;
  return NextResponse.json({ ok: true });
}