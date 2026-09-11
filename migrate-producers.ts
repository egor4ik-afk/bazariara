/**
 * migrate-producers.ts — сущности «Производитель» и «Регион» (ТЗ, разделы 4–5).
 *
 * Запуск из корня проекта:  npx tsx migrate-producers.ts
 * Идемпотентен, можно гонять повторно.
 *
 * Что делает:
 *   1. Создаёт таблицы regions и producers
 *   2. Заполняет справочник регионов Грузии
 *   3. Связывает products с producers через producer_id
 *   4. Переносит существующий farmer_slug / farmer_name в новую сущность
 *
 * Почему producer_id, а не текстовое поле (ТЗ 4.1, таблица 5):
 * текстовое имя неизбежно расползается — «CH'VENTAN», «CH’VENTAN» с типографским
 * апострофом, «Chventan» — и один производитель превращается в трёх. Внешний
 * ключ такого не допускает по определению.
 *
 * farmer_slug / farmer_name НЕ удаляем: на них завязана текущая витрина.
 * Они станут денормализованной копией, которую обновляет триггер, — так
 * карточка товара не делает лишний JOIN ради имени.
 */

import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден. Запускайте из корня проекта.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 5, idle_timeout: 20 });

/** Регионы Грузии. Список из админки редактируемый — это стартовый набор. */
const REGIONS = [
  { slug: 'kakheti',          ru: 'Кахетия',            en: 'Kakheti',           ka: 'კახეთი' },
  { slug: 'kartli',           ru: 'Картли',             en: 'Kartli',            ka: 'ქართლი' },
  { slug: 'mtskheta-mtianeti',ru: 'Мцхета-Мтианети',    en: 'Mtskheta-Mtianeti', ka: 'მცხეთა-მთიანეთი' },
  { slug: 'imereti',          ru: 'Имерети',            en: 'Imereti',           ka: 'იმერეთი' },
  { slug: 'samegrelo',        ru: 'Самегрело',          en: 'Samegrelo',         ka: 'სამეგრელო' },
  { slug: 'guria',            ru: 'Гурия',              en: 'Guria',             ka: 'გურია' },
  { slug: 'adjara',           ru: 'Аджария',            en: 'Adjara',            ka: 'აჭარა' },
  { slug: 'svaneti',          ru: 'Сванетия',           en: 'Svaneti',           ka: 'სვანეთი' },
  { slug: 'racha',            ru: 'Рача',               en: 'Racha',             ka: 'რაჭა' },
  { slug: 'javakheti',        ru: 'Джавахети',          en: 'Javakheti',         ka: 'ჯავახეთი' },
  { slug: 'samtskhe',         ru: 'Самцхе',             en: 'Samtskhe',          ka: 'სამცხე' },
  { slug: 'kvemo-kartli',     ru: 'Квемо-Картли',       en: 'Kvemo Kartli',      ka: 'ქვემო ქართლი' },
  { slug: 'tbilisi',          ru: 'Тбилиси',            en: 'Tbilisi',           ka: 'თბილისი' },
];

async function main() {
  console.log('⏳ Создаём сущности «Регион» и «Производитель»…');

  // ── 1. Регионы ──────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS regions (
      id          SERIAL PRIMARY KEY,
      slug        text UNIQUE NOT NULL,
      name        text NOT NULL,
      name_en     text,
      name_ka     text,
      description text,
      image_url   text,
      is_active   boolean NOT NULL DEFAULT true,
      sort_order  int NOT NULL DEFAULT 100,
      created_at  timestamptz NOT NULL DEFAULT NOW()
    )
  `;

  for (const [i, r] of REGIONS.entries()) {
    await sql`
      INSERT INTO regions (slug, name, name_en, name_ka, sort_order)
      VALUES (${r.slug}, ${r.ru}, ${r.en}, ${r.ka}, ${(i + 1) * 10})
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name, name_en = EXCLUDED.name_en, name_ka = EXCLUDED.name_ka
    `;
  }
  console.log(`  ✓ регионов: ${REGIONS.length}`);

  // ── 2. Производители ────────────────────────────────────────────────────
  // status вместо boolean is_published: по ТЗ нужны «активен / скрыт»,
  // но заявки от фермеров (раздел 8) добавят ещё и «на модерации».
  // Расширять enum дешевле, чем чинить boolean.
  await sql`
    CREATE TABLE IF NOT EXISTS producers (
      id           SERIAL PRIMARY KEY,
      slug         text UNIQUE NOT NULL,
      name         text NOT NULL,
      name_en      text,
      name_ka      text,
      region_id    int REFERENCES regions(id) ON DELETE SET NULL,
      locality     text,
      description     text,
      description_en  text,
      description_ka  text,
      image_url    text,
      logo_url     text,
      website      text,
      instagram    text,
      facebook     text,
      status       text NOT NULL DEFAULT 'active',
      seo_title       text,
      seo_description text,
      sort_order   int NOT NULL DEFAULT 100,
      created_at   timestamptz NOT NULL DEFAULT NOW(),
      updated_at   timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_producers_region ON producers (region_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_producers_status ON producers (status)`;
  console.log('  ✓ таблица producers');

  // ── 3. Связь товара с производителем и регионом ─────────────────────────
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS producer_id int`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS region_id int`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_type text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS farmer_slug text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS farmer_name text`;

  // Внешние ключи добавляем отдельно: ADD CONSTRAINT IF NOT EXISTS
  // в Postgres не поддерживается, поэтому проверяем каталог сами.
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_producer_fk') THEN
        ALTER TABLE products ADD CONSTRAINT products_producer_fk
          FOREIGN KEY (producer_id) REFERENCES producers(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_region_fk') THEN
        ALTER TABLE products ADD CONSTRAINT products_region_fk
          FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL;
      END IF;
    END $$
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_producer ON products (producer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_region ON products (region_id)`;
  console.log('  ✓ products.producer_id / region_id');

  // origin_type — из таблицы 11 ТЗ. Нужен, чтобы не выдавать импортный
  // товар за грузинский: у палатки Naturehike производитель есть,
  // а «Сделано в Грузии» показывать нельзя.
  await sql`
    UPDATE products SET origin_type = 'georgian_local'
    WHERE origin_type IS NULL
      AND category_key IN ('med','spetsii','churchhelaipastila','chay','otkrytki','vino','bakalea')
  `;
  await sql`
    UPDATE products SET origin_type = 'imported'
    WHERE origin_type IS NULL AND category_key IN ('hiking','power')
  `;
  await sql`UPDATE products SET origin_type = 'unknown' WHERE origin_type IS NULL`;

  // ── 4. Переносим существующего фермера ──────────────────────────────────
  const existing = await sql`
    SELECT DISTINCT farmer_slug, farmer_name
    FROM products
    WHERE farmer_slug IS NOT NULL AND farmer_slug <> ''
  `;

  for (const f of existing) {
    const slug = f.farmer_slug as string;
    const name = (f.farmer_name as string) || slug;

    const isChventan = slug === 'chventan';
    const [kakheti] = await sql`SELECT id FROM regions WHERE slug = 'kakheti'`;

    const [row] = await sql`
      INSERT INTO producers (slug, name, name_en, name_ka, region_id, locality, description, status)
      VALUES (
        ${slug}, ${name},
        ${isChventan ? name : null},
        ${isChventan ? name : null},
        ${isChventan ? kakheti?.id ?? null : null},
        ${isChventan ? 'Мсхалгори' : null},
        ${isChventan
          ? 'CH’VENTAN родился в Кахетии, в селе Мсхалгори, среди виноградников, садов и лесов. Само название по-грузински звучит почти как приглашение — «к нам». Для хозяйства это больше, чем производство еды или вина: это попытка сохранить настоящий вкус земли и создать вокруг него целый мир — виноградник, квеври, сад, сезонный урожай и домашние грузинские рецепты.\n\nГлавный принцип — минимум промышленного вмешательства и максимум самого продукта. Работа идёт небольшими партиями с опорой на сезонность сырья, поэтому ассортимент расширяется вместе с тем, что даёт земля.\n\nОтдельное направление — вино собственного производства. Виноград выращивается в Кахетии, вино делается традиционным способом в квеври. Задача не в том, чтобы каждый год повторить один и тот же вкус: каждый урожай остаётся отдельной историей.'
          : null},
        'active'
      )
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id
    `;

    await sql`
      UPDATE products
      SET producer_id = ${row.id},
          region_id   = COALESCE(region_id, (SELECT region_id FROM producers WHERE id = ${row.id})),
          updated_at  = NOW()
      WHERE farmer_slug = ${slug}
    `;
    console.log(`  ✓ производитель ${name} (#${row.id})`);
  }

  // ── 5. Денормализация имени обратно в товар ─────────────────────────────
  // Карточка товара показывает имя производителя на каждой позиции списка.
  // Триггер держит копию в актуальном состоянии, и витрине не нужен JOIN.
  await sql`
    CREATE OR REPLACE FUNCTION sync_product_producer() RETURNS trigger AS $$
    BEGIN
      IF NEW.producer_id IS NOT NULL THEN
        SELECT slug, name INTO NEW.farmer_slug, NEW.farmer_name
        FROM producers WHERE id = NEW.producer_id;
      ELSE
        NEW.farmer_slug := NULL;
        NEW.farmer_name := NULL;
      END IF;
      RETURN NEW;
    END $$ LANGUAGE plpgsql
  `;
  await sql`DROP TRIGGER IF EXISTS trg_sync_product_producer ON products`;
  await sql`
    CREATE TRIGGER trg_sync_product_producer
    BEFORE INSERT OR UPDATE OF producer_id ON products
    FOR EACH ROW EXECUTE FUNCTION sync_product_producer()
  `;

  // Переименование производителя должно разойтись по всем его товарам.
  await sql`
    CREATE OR REPLACE FUNCTION sync_producer_to_products() RETURNS trigger AS $$
    BEGIN
      IF NEW.slug IS DISTINCT FROM OLD.slug OR NEW.name IS DISTINCT FROM OLD.name THEN
        UPDATE products
        SET farmer_slug = NEW.slug, farmer_name = NEW.name
        WHERE producer_id = NEW.id;
      END IF;
      RETURN NEW;
    END $$ LANGUAGE plpgsql
  `;
  await sql`DROP TRIGGER IF EXISTS trg_sync_producer_to_products ON producers`;
  await sql`
    CREATE TRIGGER trg_sync_producer_to_products
    AFTER UPDATE ON producers
    FOR EACH ROW EXECUTE FUNCTION sync_producer_to_products()
  `;
  console.log('  ✓ триггеры синхронизации имени');

  // ── 6. Заявки от производителей (ТЗ раздел 8) ───────────────────────────
  // Заявка НЕ создаёт производителя: поток «форма → заявка → ручная
  // проверка → создание». Поэтому отдельная таблица, а не строка в producers
  // со статусом pending — иначе непроверенная заявка рискует утечь в выдачу.
  await sql`
    CREATE TABLE IF NOT EXISTS producer_applications (
      id          SERIAL PRIMARY KEY,
      contact_name text NOT NULL,
      brand_name   text NOT NULL,
      phone        text NOT NULL,
      region       text,
      products     text NOT NULL,
      social       text,
      description  text,
      status       text NOT NULL DEFAULT 'new',
      admin_note   text,
      created_at   timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_applications_status ON producer_applications (status)`;
  console.log('  ✓ таблица producer_applications');

  // ── Проверка ────────────────────────────────────────────────────────────
  const stats = await sql`
    SELECT p.slug, p.name, r.name AS region,
           (SELECT COUNT(*)::int FROM products x WHERE x.producer_id = p.id) AS products
    FROM producers p
    LEFT JOIN regions r ON r.id = p.region_id
    ORDER BY p.name
  `;
  console.log('\n🎉 Производители:');
  for (const s of stats) {
    console.log(`   ${s.name} (${s.slug}) — ${s.region || 'регион не указан'}, товаров: ${s.products}`);
  }

  const origins = await sql`
    SELECT origin_type, COUNT(*)::int AS n FROM products GROUP BY origin_type ORDER BY n DESC
  `;
  console.log('\n📍 Происхождение товаров:');
  for (const o of origins) console.log(`   ${o.origin_type}: ${o.n}`);
}

main()
  .catch((e) => { console.error('❌ Ошибка:', e); process.exitCode = 1; })
  .finally(() => sql.end());