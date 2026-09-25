/**
 * fix-blog-db.ts — проверяет и чинит автоинкремент id во ВСЕХ таблицах.
 *
 * Запуск из корня проекта:  npx tsx fix-blog-db.ts
 *
 * Внимание: скрипт работает с базой из вашего локального .env. Если на
 * Vercel в DATABASE_URL другая база или ветка Neon, он починит не ту.
 * Надёжнее проверять из самого сайта: /admin/db-health — там используется
 * ровно та база, с которой работает сайт.
 */

import 'dotenv/config';
import postgres from 'postgres';
import { inspectIds, repairId, whereAmI } from './lib/db-repair';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден. Запускайте из корня проекта.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });

async function main() {
  const where = await whereAmI(sql);
  console.log(`🔌 База: ${where.database} на ${where.host}`);
  console.log('   Сверьте с DATABASE_URL на Vercel — должен быть тот же хост.\n');

  const list = await inspectIds(sql);
  const broken = list.filter((t) => !t.ok);

  for (const t of list) {
    const how = t.identity ? 'identity' : t.default ? 'serial' : '— НЕТ';
    console.log(`  ${t.ok ? '✓' : '✗'} ${t.table.padEnd(26)} автоинкремент: ${how}`);
  }

  for (const t of broken) {
    await repairId(sql, t.table);
    console.log(`  🔧 ${t.table} — исправлено`);
  }

  for (const c of ['seo_title_en', 'seo_title_ka', 'seo_description_en', 'seo_description_ka']) {
    await sql.unsafe(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ${c} text`);
  }

  console.log(broken.length
    ? `\n🎉 Исправлено таблиц: ${broken.length}`
    : '\n✓ Все таблицы в порядке. Если сайт всё равно пишет об ошибке id —\n' +
      '  он подключён к ДРУГОЙ базе. Откройте /admin/db-health на сайте.');
}

main()
  .catch((e) => { console.error('❌ Ошибка:', e); process.exitCode = 1; })
  .finally(() => sql.end());
