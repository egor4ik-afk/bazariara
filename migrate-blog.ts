/**
 * migrate-blog.ts — CMS блога «Путеводитель по Грузии» (ТЗ раздел 6).
 *
 * Запуск из корня проекта:  npx tsx migrate-blog.ts
 * Идемпотентен.
 */

import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден. Запускайте из корня проекта.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 5, idle_timeout: 20 });

const TAGS = [
  { slug: 'routes',    name: 'Маршруты',        en: 'Routes',        ka: 'მარშრუტები' },
  { slug: 'hiking',    name: 'Хайкинг',         en: 'Hiking',        ka: 'ლაშქრობა' },
  { slug: 'tips',      name: 'Советы',          en: 'Tips',          ka: 'რჩევები' },
  { slug: 'news',      name: 'Новости',         en: 'News',          ka: 'სიახლეები' },
  { slug: 'regions',   name: 'Регионы',         en: 'Regions',       ka: 'რეგიონები' },
  { slug: 'food',      name: 'Что попробовать', en: 'What to taste', ka: 'რა დააგემოვნოთ' },
  { slug: 'practical', name: 'Практика',        en: 'Practical',     ka: 'პრაქტიკული' },
];

async function main() {
  console.log('⏳ Создаём CMS блога…');

  // author_id и status заложены сразу (ТЗ 6, врезка «Будущее развитие»):
  // на первом этапе автор один, но модель не должна мешать открыть
  // пользовательские публикации позже. Добавить FK на users дешевле,
  // чем перекраивать таблицу со статьями, на которые уже стоят ссылки.
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id              SERIAL PRIMARY KEY,
      slug            text UNIQUE NOT NULL,
      title           text NOT NULL,
      title_en        text,
      title_ka        text,
      excerpt         text,
      excerpt_en      text,
      excerpt_ka      text,
      body            text NOT NULL DEFAULT '',
      body_en         text,
      body_ka         text,
      cover_url       text,
      status          text NOT NULL DEFAULT 'draft',
      seo_title       text,
      seo_description text,
      author_name     text NOT NULL DEFAULT 'BAZARI ARA',
      author_id       int,
      published_at    timestamptz,
      created_at      timestamptz NOT NULL DEFAULT NOW(),
      updated_at      timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status, published_at DESC)`;
  console.log('  ✓ таблица posts');

  await sql`
    CREATE TABLE IF NOT EXISTS post_tags (
      id      SERIAL PRIMARY KEY,
      slug    text UNIQUE NOT NULL,
      name    text NOT NULL,
      name_en text,
      name_ka text
    )
  `;
  for (const t of TAGS) {
    await sql`
      INSERT INTO post_tags (slug, name, name_en, name_ka)
      VALUES (${t.slug}, ${t.name}, ${t.en}, ${t.ka})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `;
  }
  console.log(`  ✓ рубрик: ${TAGS.length}`);

  // Связи статьи с регионами, производителями и товарами (ТЗ 6, врезка
  // «Ключевая CMS-функция»). Отдельные таблицы связей, а не массивы id
  // в статье: только так работает обратное направление — «показать статьи
  // об этом регионе» на странице региона.
  await sql`
    CREATE TABLE IF NOT EXISTS post_regions (
      post_id   int NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      region_id int NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, region_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS post_producers (
      post_id     int NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      producer_id int NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, producer_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS post_products (
      post_id    int NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      product_id bigint NOT NULL,
      PRIMARY KEY (post_id, product_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS post_tag_links (
      post_id int NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag_id  int NOT NULL REFERENCES post_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_post_regions_region ON post_regions (region_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_post_producers_producer ON post_producers (producer_id)`;
  console.log('  ✓ таблицы связей');

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM posts`;
  if (n === 0) {
    // Одна статья-черновик, чтобы раздел не открывался пустым и было
    // на чём проверить редактор.
    await sql`
      INSERT INTO posts (slug, title, excerpt, body, status, author_name)
      VALUES (
        'chto-privezti-iz-gruzii',
        'Что привезти из Грузии: съедобный список',
        'Мёд из Рачи, чай из Гурии, сванская соль и чурчхела — что из этого переживёт дорогу и что стоит брать.',
        E'## Мёд\n\nКаштановый из Рачи — тёмный, с горчинкой. Акациевый из Имерети — светлый и мягкий, дольше остаётся жидким.\n\n## Чай\n\nГурия и Аджария — исторически чайные регионы Грузии.\n\n## Специи\n\nСванская соль и мегрельская аджика.\n\n*Это черновик: отредактируйте его в админке или удалите.*',
        'draft', 'BAZARI ARA'
      )
    `;
    console.log('  ✓ добавлен черновик статьи');
  }

  const stats = await sql`
    SELECT status, COUNT(*)::int AS n FROM posts GROUP BY status
  `;
  console.log('\n🎉 Блог готов:');
  for (const s of stats) console.log(`   ${s.status}: ${s.n}`);
  console.log('\n   Админка: /admin/blog');
  console.log('   Публично: /ru/blog');
}

main()
  .catch((e) => { console.error('❌ Ошибка:', e); process.exitCode = 1; })
  .finally(() => sql.end());
