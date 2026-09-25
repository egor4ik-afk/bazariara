/**
 * check-db.ts — проверка базы после переезда и сверка со старой.
 *
 *   npx tsx check-db.ts                  проверить структуру базы из .env
 *   npx tsx check-db.ts --fix            восстановить недостающее в структуре
 *   OLD_DATABASE_URL=... npx tsx check-db.ts           + сравнить данные со старой базой
 *   OLD_DATABASE_URL=... npx tsx check-db.ts --copy    + перенести из старой то, чего нет в новой
 *
 * Зачем. 23.09 база переехала на новый адрес скриптом migrate-full-db.ts.
 * В его шапке прямо сказано: функции и триггеры не переносятся. На деле
 * не перенёсся и автоинкремент id — его уже починила /admin/db-health.
 * А локальный .env ещё сутки смотрел на старую базу, и всё, что за это
 * время записали скрипты, лежит там.
 *
 * Скрипт ничего не удаляет. --fix только добавляет недостающее,
 * --copy только переносит строки, которых в новой базе нет совсем.
 * Строки, которые есть в обеих базах, не трогаются никогда.
 */

import 'dotenv/config';
import postgres, { type Sql } from 'postgres';
import { inspectIds, repairId, whereAmI } from './lib/db-repair';

const NEW_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;
const OLD_URL = process.env.OLD_DATABASE_URL;
const FIX = process.argv.includes('--fix');
const COPY = process.argv.includes('--copy');
const VERCEL_HOST = 'ep-super-sunset-asn0d7v8';

if (!NEW_URL) { console.error('❌ DATABASE_URL не найден в .env'); process.exit(1); }
if (COPY && !OLD_URL) { console.error('❌ Для --copy нужен OLD_DATABASE_URL'); process.exit(1); }

const opts = { ssl: 'require' as const, max: 1, prepare: false, onnotice: () => {} };
const db = postgres(NEW_URL, opts);
const old = OLD_URL ? postgres(OLD_URL, opts) : null;

let problems = 0;
const bad = (msg: string) => { problems++; console.log(`  ✗ ${msg}`); };
const good = (msg: string) => console.log(`  ✓ ${msg}`);

// ─────────────────────────────── Ожидаемая структура ───────────────────────

const TABLES = [
  'categories', 'subcategories', 'products', 'orders', 'regions', 'producers',
  'producer_applications', 'posts', 'post_tags', 'post_tag_links',
  'post_regions', 'post_producers', 'post_products',
];

/** Колонки, которые добавляли миграции поверх исходной схемы. */
const COLUMNS: Record<string, [string, string][]> = {
  products:  [['producer_id', 'int'], ['region_id', 'int'], ['origin_type', 'text'],
              ['farmer_slug', 'text'], ['farmer_name', 'text']],
  orders:    [['referral_source', 'text'], ['referral_comment', 'text']],
  producers: [['locality_en', 'text'], ['locality_ka', 'text'],
              ['seo_title_en', 'text'], ['seo_title_ka', 'text'],
              ['seo_description_en', 'text'], ['seo_description_ka', 'text']],
  posts:     [['seo_title_en', 'text'], ['seo_title_ka', 'text'],
              ['seo_description_en', 'text'], ['seo_description_ka', 'text']],
};

/** Уникальность, на которую опирается ON CONFLICT в коде. Без неё — ошибка 42P10. */
const UNIQUE: [string, string][] = [
  ['categories', 'category_key'], ['subcategories', 'key'], ['products', 'external_id'],
  ['regions', 'slug'], ['producers', 'slug'], ['posts', 'slug'], ['post_tags', 'slug'],
];

const TRIGGER_SQL = [
  `CREATE OR REPLACE FUNCTION sync_product_producer() RETURNS trigger AS $$
   BEGIN
     IF NEW.producer_id IS NOT NULL THEN
       SELECT slug, name INTO NEW.farmer_slug, NEW.farmer_name FROM producers WHERE id = NEW.producer_id;
     ELSE
       NEW.farmer_slug := NULL; NEW.farmer_name := NULL;
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS trg_sync_product_producer ON products`,
  `CREATE TRIGGER trg_sync_product_producer BEFORE INSERT OR UPDATE OF producer_id ON products
   FOR EACH ROW EXECUTE FUNCTION sync_product_producer()`,
  `CREATE OR REPLACE FUNCTION sync_producer_to_products() RETURNS trigger AS $$
   BEGIN
     IF NEW.slug IS DISTINCT FROM OLD.slug OR NEW.name IS DISTINCT FROM OLD.name THEN
       UPDATE products SET farmer_slug = NEW.slug, farmer_name = NEW.name WHERE producer_id = NEW.id;
     END IF;
     RETURN NEW;
   END $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS trg_sync_producer_to_products ON producers`,
  `CREATE TRIGGER trg_sync_producer_to_products AFTER UPDATE ON producers
   FOR EACH ROW EXECUTE FUNCTION sync_producer_to_products()`,
];

// ─────────────────────────────── Проверка структуры ────────────────────────

async function checkStructure(sql: Sql) {
  console.log('\n① Таблицы');
  const tables = new Set((await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `).map((r: any) => r.table_name));
  const missingTables = TABLES.filter((t) => !tables.has(t));
  // orders создаёт сам чекаут при первом заказе — её отсутствие не поломка
  const lazy = missingTables.filter((t) => t === 'orders');
  const real = missingTables.filter((t) => t !== 'orders');
  if (real.length) bad(`нет таблиц: ${real.join(', ')} — запустите migrate-producers.ts и migrate-blog.ts`);
  if (lazy.length) console.log('  · orders пока нет — создастся сама при первом заказе');
  if (!missingTables.length) good(`все ${TABLES.length} на месте`);

  console.log('\n② Колонки от миграций');
  for (const [table, cols] of Object.entries(COLUMNS)) {
    if (!tables.has(table)) continue;
    const have = new Set((await sql`
      SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table}
    `).map((r: any) => r.column_name));
    const miss = cols.filter(([c]) => !have.has(c));
    if (!miss.length) { good(`${table}`); continue; }
    bad(`${table}: нет ${miss.map(([c]) => c).join(', ')}`);
    if (FIX) for (const [c, type] of miss) {
      await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${c} ${type}`);
      console.log(`    🔧 добавлена ${table}.${c}`);
    }
  }

  console.log('\n③ Уникальность (на ней держится сохранение без дублей)');
  for (const [table, col] of UNIQUE) {
    if (!tables.has(table)) continue;
    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = ${table}::regclass AND i.indisunique AND i.indnatts = 1 AND a.attname = ${col}
    `;
    if (n) { good(`${table}.${col}`); continue; }
    bad(`${table}.${col} не уникальна`);
    if (FIX) {
      try {
        await sql.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_${col}_key ON ${table} (${col})`);
        console.log(`    🔧 восстановлена`);
      } catch (e: any) {
        console.log(`    ⚠ не удалось: в ${table}.${col} есть дубли. ${e.message}`);
      }
    }
  }

  console.log('\n④ Триггеры синхронизации имени фермера');
  const trg = new Set((await sql`
    SELECT tgname FROM pg_trigger WHERE NOT tgisinternal
  `).map((r: any) => r.tgname));
  const needTrg = ['trg_sync_product_producer', 'trg_sync_producer_to_products'];
  const missTrg = needTrg.filter((t) => !trg.has(t));
  if (!missTrg.length) good('оба на месте');
  else {
    bad(`нет: ${missTrg.join(', ')} — выбор фермера в товаре не проставит его имя на сайте`);
    if (FIX && tables.has('producers')) {
      for (const q of TRIGGER_SQL) await sql.unsafe(q);
      // Досчитываем то, что триггер должен был проставить, пока его не было
      const fixed = await sql`
        UPDATE products p SET farmer_slug = pr.slug, farmer_name = pr.name
        FROM producers pr
        WHERE p.producer_id = pr.id
          AND (p.farmer_slug IS DISTINCT FROM pr.slug OR p.farmer_name IS DISTINCT FROM pr.name)
        RETURNING p.id
      `;
      console.log(`    🔧 триггеры восстановлены, имя фермера проставлено товарам: ${fixed.length}`);
    }
  }

  console.log('\n⑤ Автоинкремент id');
  const ids = await inspectIds(sql);
  const broken = ids.filter((t) => !t.ok);
  if (!broken.length) good(`в порядке во всех ${ids.length} таблицах`);
  else {
    bad(`нет автоинкремента: ${broken.map((t) => t.table).join(', ')}`);
    if (FIX) for (const t of broken) { await repairId(sql, t.table); console.log(`    🔧 ${t.table}`); }
  }
}

// ─────────────────────────────── Сверка данных ─────────────────────────────

/** Таблица, её естественный ключ и внешние ключи, которые надо пересчитать по slug. */
const DATA: { table: string; key: string; remap?: Record<string, string> }[] = [
  { table: 'regions',   key: 'slug' },
  { table: 'categories', key: 'category_key' },
  { table: 'subcategories', key: 'key' },
  { table: 'producers', key: 'slug', remap: { region_id: 'regions' } },
  { table: 'products',  key: 'external_id', remap: { producer_id: 'producers', region_id: 'regions' } },
  { table: 'post_tags', key: 'slug' },
  { table: 'posts',     key: 'slug' },
];

async function cols(sql: Sql, table: string): Promise<string[]> {
  return (await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} ORDER BY ordinal_position
  `).map((r: any) => r.column_name);
}

/** id в старой базе → slug → id в новой. Для producers и regions. */
async function idMap(table: string): Promise<Map<number, number>> {
  const o = await old!.unsafe(`SELECT id, slug FROM ${table}`);
  const n = await db.unsafe(`SELECT id, slug FROM ${table}`);
  const bySlug = new Map(n.map((r: any) => [r.slug, Number(r.id)]));
  const m = new Map<number, number>();
  for (const r of o) { const id = bySlug.get(r.slug); if (id) m.set(Number(r.id), id); }
  return m;
}

async function compare() {
  console.log('\n⑥ Сверка данных со старой базой');
  const w = await whereAmI(old!);
  console.log(`   старая: ${w.database} на ${w.host}`);

  for (const d of DATA) {
    let oldRows: any[], newKeys: Set<string>;
    try {
      oldRows = await old!.unsafe(`SELECT * FROM ${d.table}`);
      newKeys = new Set((await db.unsafe(`SELECT ${d.key} AS k FROM ${d.table}`)).map((r: any) => String(r.k)));
    } catch (e: any) {
      console.log(`  · ${d.table}: пропускаю (${e.message.slice(0, 60)})`);
      continue;
    }
    const missing = oldRows.filter((r) => r[d.key] != null && !newKeys.has(String(r[d.key])));
    if (!missing.length) { good(`${d.table}: всё из старой есть в новой`); continue; }

    bad(`${d.table}: ${missing.length} есть только в СТАРОЙ — ${missing.slice(0, 5).map((r) => r[d.key]).join(', ')}${missing.length > 5 ? '…' : ''}`);
    if (!COPY) continue;

    // Переносим только отсутствующие строки. id не переносим — новая база
    // выдаст свой; внешние ключи пересчитываем через slug.
    const shared = (await cols(db, d.table)).filter((c) => c !== 'id' && Object.prototype.hasOwnProperty.call(missing[0], c));
    const maps: Record<string, Map<number, number>> = {};
    for (const [col, ref] of Object.entries(d.remap || {})) maps[col] = await idMap(ref);

    let copied = 0;
    for (const row of missing) {
      const values = shared.map((c) => {
        const v = row[c];
        if (maps[c] && v != null) return maps[c].get(Number(v)) ?? null;
        if (v !== null && typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      });
      const ph = shared.map((_, i) => `$${i + 1}`).join(', ');
      await db.unsafe(
        `INSERT INTO ${d.table} (${shared.join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING`, values as any[]
      );
      copied++;
    }
    console.log(`    📦 перенесено: ${copied}`);
  }

  // Заявки и заказы — без естественного ключа, сравниваем по времени
  // создания с точностью до миллисекунды. Postgres хранит микросекунды,
  // а JavaScript — только миллисекунды: перенесённая строка теряла
  // микросекунды, выглядела «раньше» оригинала, и повторный --copy её
  // задваивал. Поймано на тестовом переезде.
  const SAME: Record<string, string> = {
    producer_applications: 'phone = $1 AND brand_name = $2',
    orders: 'total IS NOT DISTINCT FROM $1 AND customer::text = $2::text',
  };
  for (const t of ['producer_applications', 'orders']) {
    try {
      const [{ max }] = await db.unsafe(`SELECT MAX(date_trunc('milliseconds', created_at)) AS max FROM ${t}`);
      const newer = await old!.unsafe(
        `SELECT * FROM ${t} WHERE date_trunc('milliseconds', created_at) > $1 ORDER BY created_at`,
        [max || new Date(0)]
      );
      if (!newer.length) { good(`${t}: новых в старой базе нет`); continue; }
      bad(`${t}: ${newer.length} появились в СТАРОЙ после переезда`);
      if (!COPY) continue;
      const shared = (await cols(db, t)).filter((c) => c !== 'id' && c in newer[0]);
      let copied = 0;
      for (const row of newer) {
        // Страховка от дублей: такая же строка с тем же временем уже есть?
        const keyVals = t === 'orders'
          ? [row.total, JSON.stringify(row.customer)]
          : [row.phone, row.brand_name];
        const [dup] = await db.unsafe(
          `SELECT 1 FROM ${t} WHERE ${SAME[t]} AND date_trunc('milliseconds', created_at) = date_trunc('milliseconds', $3::timestamptz) LIMIT 1`,
          [...keyVals, row.created_at] as any[]
        );
        if (dup) continue;
        const values = shared.map((c) => {
          const v = row[c];
          return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
        });
        await db.unsafe(
          `INSERT INTO ${t} (${shared.join(', ')}) VALUES (${shared.map((_, i) => `$${i + 1}`).join(', ')})`,
          values as any[]
        );
        copied++;
      }
      console.log(`    📦 перенесено: ${copied}`);
    } catch (e: any) {
      console.log(`  · ${t}: пропускаю (${e.message.slice(0, 60)})`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const w = await whereAmI(db);
  const match = w.host.includes(VERCEL_HOST);
  console.log(`🔌 База из .env: ${w.database} на ${w.host}`);
  console.log(match
    ? '   ✓ та же, что у сайта на Vercel'
    : `   ✗ НЕ та, что у сайта (${VERCEL_HOST}) — поправьте DATABASE_URL в .env`);
  if (!match) problems++;

  await checkStructure(db);
  if (old) await compare();

  console.log(`\n${problems ? `Найдено проблем: ${problems}` : '🎉 Всё в порядке'}`);
  if (problems && !FIX && !COPY) {
    console.log('Структуру чинит --fix. Данные из старой базы переносит --copy (с OLD_DATABASE_URL).');
  }
}

main()
  .catch((e) => { console.error('❌', e.message); process.exitCode = 1; })
  .finally(async () => { await db.end(); if (old) await old.end(); });
