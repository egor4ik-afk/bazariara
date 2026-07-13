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
  maybe('category',        'category');
  maybe('category_en',     'category_en');
  maybe('category_ka',     'category_ka');
  maybe('sub_category',    'sub_category');
  maybe('sub_category_en', 'sub_category_en');
  maybe('sub_category_ka', 'sub_category_ka');
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

  // category_key
  if (has('external_id') || has('category')) {
    const eid = body.external_id;
    const cat = body.category;
    const key = eid
      ? eid.split('_')[0]
      : cat ? cat.toLowerCase().replace(/\s+/g, '-') : null;
    if (key) {
      updates.push(`category_key = $${idx++}`);
      values.push(key);
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: true, message: 'nothing to update' });
  }

  updates.push(`updated_at = NOW()`);
  values.push(parseInt(id));

  await sql.unsafe(
    `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} AND source = 'gorgia'`,
    values as any
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const { id } = await params;
  await sql`DELETE FROM products WHERE id = ${parseInt(id)} AND source = 'gorgia'`;
  return NextResponse.json({ ok: true });
}
