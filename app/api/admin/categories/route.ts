// FILE: app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

const TRANS: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',
  м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => TRANS[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '');
}

// У подкатегорий в вашей БД ключ — это НЕ транслитерация, а кириллица в нижнем
// регистре с дефисами вместо пробелов (см. "коллекторы-и-бойлеры", "центральное-отопление").
// Если генерить ключ по-другому (латиницей), получится дубль с другим ключом на то же имя.
function slugifySub(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-');
}

async function autoTranslate(nameRu: string, origin: string): Promise<{ en: string; ka: string }> {
  try {
    const res = await fetch(`${origin}/api/admin/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_ru: nameRu, name_en: '', name_ka: '',
        category_ru: nameRu, provider: 'opencode', mode: 'name',
      }),
    });
    const data = await res.json();
    return { en: data.en || '', ka: data.ka || '' };
  } catch (e) {
    console.error('autoTranslate failed:', e);
    return { en: '', ka: '' };
  }
}

// ── GET — диагностика: что реально лежит в categories/subcategories,
//    плюс какие sub_category у товаров ещё НЕ зарегистрированы как подкатегория ──
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const categories = await sql`
      SELECT c.category_key, c.name, c.name_en, c.name_ka,
             (SELECT COUNT(*) FROM products p WHERE p.category_key = c.category_key AND p.source = 'gorgia') AS product_count
      FROM categories c
      ORDER BY c.name, c.category_key
    `;

    const subcategories = await sql`
      SELECT category_key, key, name, name_en, name_ka FROM subcategories
      ORDER BY category_key, name
    `;

    // sub_category у товаров, для которых ЕЩЁ НЕТ строки в subcategories
    const orphanSubCategories = await sql`
      SELECT p.category_key, p.sub_category, COUNT(*) AS cnt
      FROM products p
      WHERE p.source = 'gorgia'
        AND p.sub_category IS NOT NULL
        AND p.sub_category != ''
        AND NOT EXISTS (
          SELECT 1 FROM subcategories s
          WHERE s.category_key = p.category_key AND s.name = p.sub_category
        )
      GROUP BY p.category_key, p.sub_category
      ORDER BY p.category_key, cnt DESC
    `;

    return NextResponse.json({ categories, subcategories, orphanSubCategories });
  } catch (err) {
    console.error('GET /api/admin/categories:', err);
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}

// ── POST — несколько действий ──────────────────────────────────────────────
//
// Создать категорию (авто-перевод, если en/ka не переданы):
//   { "action": "create_category", "name_ru": "Обогреватели" }
//
// Создать подкатегорию:
//   { "action": "create_subcategory", "category_key": "klimaticheskoeoborudovanie", "name_ru": "Вентиляторы" }
//
// Забэкфиллить ВСЕ недостающие подкатегории для категории — смотрит DISTINCT
// products.sub_category, которых ещё нет в таблице subcategories, и создаёт их разом:
//   { "action": "sync_subcategories", "category_key": "klimaticheskoeoborudovanie" }
//
// Слить дублирующую категорию в канонический ключ — переносит товары И удаляет
// дублирующую строку из таблицы categories (тот самый climate -> klimaticheskoeoborudovanie):
//   { "action": "merge_categories", "from_key": "climate", "to_key": "klimaticheskoeoborudovanie" }
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const origin = req.nextUrl.origin;

    // ── Создать категорию ────────────────────────────────────────────────
    if (body.action === 'create_category') {
      const nameRu: string = (body.name_ru || '').trim();
      if (!nameRu) return NextResponse.json({ error: 'name_ru обязателен' }, { status: 400 });

      const existing = await sql`SELECT category_key FROM categories WHERE name = ${nameRu} LIMIT 1`;
      if (existing.length > 0) {
        return NextResponse.json({ ok: true, existed: true, category_key: existing[0].category_key });
      }

      let nameEn = (body.name_en || '').trim();
      let nameKa = (body.name_ka || '').trim();
      if (!nameEn || !nameKa) {
        const t = await autoTranslate(nameRu, origin);
        nameEn = nameEn || t.en;
        nameKa = nameKa || t.ka;
      }

      const categoryKey = slugify(nameRu);
      await sql`
        INSERT INTO categories (category_key, name, name_en, name_ka)
        VALUES (${categoryKey}, ${nameRu}, ${nameEn}, ${nameKa})
        ON CONFLICT (category_key) DO NOTHING
      `;
      return NextResponse.json({ ok: true, category_key: categoryKey, name: nameRu, name_en: nameEn, name_ka: nameKa });
    }

    // ── Создать подкатегорию ─────────────────────────────────────────────
    if (body.action === 'create_subcategory') {
      const categoryKey: string = body.category_key;
      const nameRu: string = (body.name_ru || '').trim();
      if (!categoryKey) return NextResponse.json({ error: 'category_key обязателен' }, { status: 400 });
      if (!nameRu) return NextResponse.json({ error: 'name_ru обязателен' }, { status: 400 });

      const existing = await sql`
        SELECT key FROM subcategories WHERE category_key = ${categoryKey} AND name = ${nameRu} LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json({ ok: true, existed: true, key: existing[0].key });
      }

      let nameEn = (body.name_en || '').trim();
      let nameKa = (body.name_ka || '').trim();
      if (!nameEn || !nameKa) {
        const t = await autoTranslate(nameRu, origin);
        nameEn = nameEn || t.en;
        nameKa = nameKa || t.ka;
      }

      const key = slugifySub(nameRu);
      await sql`
        INSERT INTO subcategories (category_key, key, name, name_en, name_ka)
        VALUES (${categoryKey}, ${key}, ${nameRu}, ${nameEn}, ${nameKa})
        ON CONFLICT (key) DO NOTHING
      `;
      return NextResponse.json({ ok: true, key, name: nameRu, name_en: nameEn, name_ka: nameKa });
    }

    // ── Удалить подкатегорию (для чистки дублей вроде ventilyatory/konditsionery) ──
    if (body.action === 'delete_subcategory') {
      const key: string = body.key;
      if (!key) return NextResponse.json({ error: 'key обязателен' }, { status: 400 });

      const deleted = await sql`DELETE FROM subcategories WHERE key = ${key} RETURNING key, name`;
      if (deleted.length === 0) {
        return NextResponse.json({ error: `Подкатегория с ключом '${key}' не найдена` }, { status: 404 });
      }
      return NextResponse.json({ ok: true, deleted: deleted[0] });
    }

    // ── Забэкфиллить недостающие подкатегории из реальных товаров ──────────
    if (body.action === 'sync_subcategories') {
      const categoryKey: string = body.category_key;
      if (!categoryKey) return NextResponse.json({ error: 'category_key обязателен' }, { status: 400 });

      const orphans = await sql`
        SELECT DISTINCT p.sub_category
        FROM products p
        WHERE p.source = 'gorgia'
          AND p.category_key = ${categoryKey}
          AND p.sub_category IS NOT NULL
          AND p.sub_category != ''
          AND NOT EXISTS (
            SELECT 1 FROM subcategories s
            WHERE s.category_key = ${categoryKey} AND s.name = p.sub_category
          )
      `;

      const created: { key: string; name: string }[] = [];
      for (const row of orphans) {
        const nameRu = row.sub_category as string;
        const t = await autoTranslate(nameRu, origin);
        const key = slugifySub(nameRu);
        await sql`
          INSERT INTO subcategories (category_key, key, name, name_en, name_ka)
          VALUES (${categoryKey}, ${key}, ${nameRu}, ${t.en}, ${t.ka})
          ON CONFLICT (key) DO NOTHING
        `;
        created.push({ key, name: nameRu });
      }

      return NextResponse.json({ ok: true, created, count: created.length });
    }

    // ── Слить дублирующую категорию в каноническую ──────────────────────
    if (body.action === 'merge_categories') {
      const fromKey: string = body.from_key;
      const toKey: string = body.to_key;
      if (!fromKey || !toKey) {
        return NextResponse.json({ error: 'from_key и to_key обязательны' }, { status: 400 });
      }
      if (fromKey === toKey) {
        return NextResponse.json({ error: 'from_key и to_key совпадают' }, { status: 400 });
      }

      const targetCat = await sql`SELECT name, name_en, name_ka FROM categories WHERE category_key = ${toKey} LIMIT 1`;
      if (targetCat.length === 0) {
        return NextResponse.json({ error: `Целевой ключ '${toKey}' не найден в categories` }, { status: 404 });
      }
      const { name, name_en, name_ka } = targetCat[0];

      const movedProducts = await sql`
        UPDATE products
        SET category_key = ${toKey}, category = ${name}, category_en = ${name_en}, category_ka = ${name_ka},
            updated_at = NOW()
        WHERE category_key = ${fromKey} AND source = 'gorgia'
        RETURNING id
      `;

      const movedSubs = await sql`
        UPDATE subcategories SET category_key = ${toKey}
        WHERE category_key = ${fromKey}
          AND NOT EXISTS (SELECT 1 FROM subcategories s2 WHERE s2.category_key = ${toKey} AND s2.name = subcategories.name)
        RETURNING key
      `;
      // подкатегории-дубли (которые не перенеслись из-за конфликта имени) — просто удаляем как мусор
      await sql`DELETE FROM subcategories WHERE category_key = ${fromKey}`;

      const deletedCategory = await sql`
        DELETE FROM categories WHERE category_key = ${fromKey} RETURNING category_key
      `;

      return NextResponse.json({
        ok: true,
        moved_products: movedProducts.length,
        moved_subcategories: movedSubs.length,
        deleted_category_row: deletedCategory.length > 0,
      });
    }

    // ── Переименовать category_key НА МЕСТЕ (когда строка одна, но ключ неверный —
    //    например мердж случайно сделали в обратную сторону) ─────────────
    if (body.action === 'rename_category_key') {
      const fromKey: string = body.from_key;
      const toKey: string = body.to_key;
      if (!fromKey || !toKey) {
        return NextResponse.json({ error: 'from_key и to_key обязательны' }, { status: 400 });
      }

      const existing = await sql`SELECT category_key FROM categories WHERE category_key = ${fromKey} LIMIT 1`;
      if (existing.length === 0) {
        return NextResponse.json({ error: `Ключ '${fromKey}' не найден в categories — переименовывать нечего` }, { status: 404 });
      }
      const clash = await sql`SELECT category_key FROM categories WHERE category_key = ${toKey} LIMIT 1`;
      if (clash.length > 0) {
        return NextResponse.json({ error: `Ключ '${toKey}' уже занят — используйте merge_categories вместо rename` }, { status: 409 });
      }

      await sql`UPDATE categories SET category_key = ${toKey} WHERE category_key = ${fromKey}`;
      await sql`UPDATE subcategories SET category_key = ${toKey} WHERE category_key = ${fromKey}`;

      const movedProducts = await sql`
        UPDATE products
        SET category_key = ${toKey},
            external_id = CASE
              WHEN external_id IS NOT NULL AND position('_' in external_id) > 0
              THEN ${toKey} || '_' || split_part(external_id, '_', 2)
              ELSE external_id
            END,
            updated_at = NOW()
        WHERE category_key = ${fromKey} AND source = 'gorgia'
        RETURNING id
      `;

      return NextResponse.json({ ok: true, renamed_to: toKey, moved_products: movedProducts.length });
    }

    return NextResponse.json(
      { error: "action должен быть create_category | create_subcategory | sync_subcategories | merge_categories | rename_category_key" },
      { status: 400 }
    );
  } catch (err) {
    console.error('POST /api/admin/categories:', err);
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}