/**
 * migrate-farmers-i18n.ts — локализация раздела «Фермеры» (ТЗ v1.0, раздел 5).
 *
 * Запуск:  npx tsx migrate-farmers-i18n.ts
 * Идемпотентен. Ничего не удаляет и не перезаписывает (ТЗ, раздел 9).
 *
 * name_en/name_ka и description_en/description_ka уже есть с прошлой
 * миграции. Добавляем то, чего не хватало по пункту 5.1: локализованную
 * локацию и SEO-поля по языкам.
 */

import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден. Запускайте из корня проекта.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 3, idle_timeout: 20 });

async function main() {
  console.log('⏳ Добавляем языковые поля фермерам…');

  for (const col of [
    'locality_en', 'locality_ka',
    'seo_title_en', 'seo_title_ka',
    'seo_description_en', 'seo_description_ka',
  ]) {
    await sql.unsafe(`ALTER TABLE producers ADD COLUMN IF NOT EXISTS ${col} text`);
  }
  console.log('  ✓ locality / seo_title / seo_description × en, ka');

  // Все новые поля пустые — это безопасно для старых записей: страница
  // фермера падает на русский вариант (ТЗ 5.2), и ничего не ломается.
  const [{ total, no_en, no_ka }] = await sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE COALESCE(description_en, '') = '')::int AS no_en,
           COUNT(*) FILTER (WHERE COALESCE(description_ka, '') = '')::int AS no_ka
    FROM producers
  `;

  console.log(`\n🎉 Готово. Фермеров: ${total}`);
  console.log(`   Без английского описания: ${no_en}`);
  console.log(`   Без грузинского описания: ${no_ka}`);
  if (no_en || no_ka) {
    console.log('   Им будет показан русский текст — заполните переводы в /admin/producers.');
  }
}

main()
  .catch((e) => { console.error('❌ Ошибка:', e); process.exitCode = 1; })
  .finally(() => sql.end());
