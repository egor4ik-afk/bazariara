// FILE: app/api/admin/products/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

// POST /api/admin/products/bulk
//
// Массовое удаление:
//   { "action": "delete", "ids": [1,2,3] }
//
// Массовое редактирование (передавайте только те поля, что хотите поменять):
//   {
//     "action": "update",
//     "ids": [1,2,3],
//     "fields": {
//       "category": "Климатическое оборудование",
//       "category_key": "klimaticheskoeoborudovanie",
//       "category_en": "Climate equipment",
//       "category_ka": "...",
//       "sub_category": "Кондиционеры",
//       "sub_category_en": "Air conditioners",
//       "sub_category_ka": "...",
//       "in_stock": true,
//       "availability": "В наличии"
//     }
//   }
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    let body: { action?: string; ids?: unknown[]; fields?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const ids = Array.isArray(body.ids)
      ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Нет валидных ids' }, { status: 400 });
    }

    // ── Массовое удаление ────────────────────────────────────────────
    if (body.action === 'delete') {
      // тег-шаблон sql (не .unsafe) сам корректно биндит JS-массив под ANY()
      const rows = await sql`
        DELETE FROM products
        WHERE id = ANY(${ids}) AND source = 'gorgia'
        RETURNING id
      `;
      return NextResponse.json({ ok: true, deleted: rows.length, ids: rows.map((r) => r.id) });
    }

    // ── Массовое редактирование ──────────────────────────────────────
    if (body.action === 'update') {
      const fields = body.fields || {};
      const has = (key: string) => key in fields && fields[key] !== undefined && fields[key] !== '';

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const maybe = (col: string, key: string, transform?: (v: unknown) => unknown) => {
        if (!has(key)) return;
        const val = transform ? transform(fields[key]) : fields[key];
        updates.push(`${col} = $${idx++}`);
        values.push(val);
      };

      maybe('category',        'category');
      maybe('category_key',    'category_key');
      maybe('category_en',     'category_en');
      maybe('category_ka',     'category_ka');
      maybe('sub_category',    'sub_category');
      maybe('sub_category_en', 'sub_category_en');
      maybe('sub_category_ka', 'sub_category_ka');
      maybe('availability',    'availability');
      if ('in_stock' in fields) {
        updates.push(`in_stock = $${idx++}`);
        values.push(Boolean(fields.in_stock));
      }

      if (updates.length === 0) {
        return NextResponse.json({ ok: true, message: 'Нечего обновлять (fields пустой)' });
      }

      updates.push('updated_at = NOW()');

      // id уже провалидированы как целые положительные числа выше —
      // безопасно подставлять напрямую, без плейсхолдера-массива через sql.unsafe
      const idList = ids.join(',');

      await sql.unsafe(
        `UPDATE products SET ${updates.join(', ')} WHERE id IN (${idList}) AND source = 'gorgia'`,
        values as never
      );

      return NextResponse.json({ ok: true, updated: ids.length, ids });
    }

    return NextResponse.json(
      { error: "action должен быть 'delete' или 'update'" },
      { status: 400 }
    );
  } catch (err) {
    console.error('POST /api/admin/products/bulk:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}