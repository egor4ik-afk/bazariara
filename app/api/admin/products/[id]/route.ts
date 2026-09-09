import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const { id } = await params;
  const body = await req.json();

  // Берём только те поля которые реально пришли в body (не undefined)
  const has = (key: string) => key in body && body[key] !== undefined;

  const updates: string[] = [];
  const values: unknown[]  = [];
  let   idx = 1;

  const maybe = (col: string, key: string, transform?: (v: unknown) => unknown) => {
    if (!has(key)) return;
    const val = transform ? transform(body[key]) : (body[key] ?? null);
    updates.push(`${col} = $${idx++}`);
    values.push(val);
  };

  maybe('external_id',     'external_id');
  maybe('name',            'name_ru');
  maybe('name_ru',         'name_ru');
  maybe('name_en',         'name_en');
  maybe('name_ka',         'name_ka');
  maybe('description',     'description_ru');
  maybe('description_ru',  'description_ru');
  maybe('description_en',  'description_en');
  maybe('description_ka',  'description_ka');
  maybe('sku',             'sku');
  maybe('price',           'price',    v => v ? parseFloat(String(v)) : null);
  maybe('in_stock',        'in_stock', v => Boolean(v));
  maybe('availability',    'availability');
  maybe('sub_category',    'sub_category');
  maybe('sub_category_en', 'sub_category_en');
  maybe('sub_category_ka', 'sub_category_ka');
  maybe('farmer_slug',     'farmer_slug', v => String(v || '').trim() || null);
  maybe('farmer_name',     'farmer_name', v => String(v || '').trim() || null);
  maybe('image_url',       'image_url');
  maybe('source_url',      'source_url');

  // images — особый случай: jsonb
  if (has('images') || has('image_url')) {
    const imgs  = body.images;
    const imgUrl = body.image_url;
    const arr   = Array.isArray(imgs) ? imgs : (imgUrl ? [imgUrl] : undefined);
    if (arr !== undefined) {
      updates.push(`images = $${idx++}::jsonb`);
      values.push(JSON.stringify(arr));
    }
  }

  let category_key_for_subcategories: string | null = null;
  if (has('category_key')) {
      const category_key = body.category_key;
      category_key_for_subcategories = category_key;

      if (category_key) {
        const cat = await sql`
          SELECT name, name_en, name_ka FROM categories WHERE category_key = ${category_key} LIMIT 1
        `;
        if (cat.length === 0) {
          return NextResponse.json(
            { error: `Категория '${category_key}' не найдена. Создайте её сначала.` },
            { status: 400 }
          );
        }
        updates.push(`category = $${idx++}`, `category_en = $${idx++}`, `category_ka = $${idx++}`);
        values.push(cat[0].name, cat[0].name_en, cat[0].name_ka);
      } else {
        updates.push(`category = $${idx++}`, `category_en = $${idx++}`, `category_ka = $${idx++}`);
        values.push(null, null, null);
      }
      updates.push(`category_key = $${idx++}`);
      values.push(category_key);
  } else {
     const r = await sql`SELECT category_key FROM products WHERE id = ${parseInt(id)}`;
     if (r.length > 0) {
        category_key_for_subcategories = r[0].category_key;
     }
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: true, message: 'nothing to update' });
  }

  updates.push(`updated_at = NOW()`);
  updates.push(`currency = 'GEL'`);
  values.push(parseInt(id));

  await sql.unsafe(
    `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} AND source = 'gorgia'`,
    values as any
  );

  if (body.sub_category && category_key_for_subcategories) {
    const subKey = body.sub_category.trim().toLowerCase().replace(/\s+/g, '-');
    await sql`
      INSERT INTO subcategories (category_key, key, name, name_en, name_ka, image_url)
      VALUES (${category_key_for_subcategories}, ${subKey}, ${body.sub_category},
              ${body.sub_category_en || null}, ${body.sub_category_ka || null}, ${body.image_url || null})
      ON CONFLICT (key) DO NOTHING
    `;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const { id } = await params;
  await sql`DELETE FROM products WHERE id = ${parseInt(id)} AND source = 'gorgia'`;
  return NextResponse.json({ ok: true });
}
