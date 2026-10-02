/**
 * check-db-connection.ts — проверяет, к какой базе подключён терминал.
 *
 * Запускать ПЕРЕД любым скриптом, который пишет в базу.
 * Только читает, ничего не меняет.
 *
 *   npx tsx check-db-connection.ts
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ СКРИПТ
 *
 * Скрипты в терминале берут DATABASE_URL из локального .env, а сайт на
 * Vercel — из своих Environment Variables. Если это разные базы или разные
 * ветки Neon, скрипт отработает без единой ошибки и обновит не ту базу.
 * Сообщения об ошибке не будет: с точки зрения скрипта всё прошло успешно,
 * просто изменения уедут не туда, где их ждут.
 *
 * Эта же мысль записана в шапке app/api/admin/db-health/route.ts — там
 * диагностика специально сделана эндпоинтом сайта, а не скриптом, именно
 * чтобы гарантированно попасть в ту базу, с которой работает сайт.
 *
 * Поэтому порядок такой:
 *   1. npx tsx check-db-connection.ts   — посмотреть, куда подключились
 *   2. сверить host и database с тем, что в Vercel
 *   3. только потом запускать правки
 */

import 'dotenv/config';
import postgres from 'postgres';

const PLACEHOLDERS = [
  'postgres://user:password@host:port/db',
  'postgresql://user:password@host:port/db',
  'user:password@host',
  'ваш_url',
  'your_url',
  '<',
];

function fail(title: string, lines: string[]): never {
  console.error(`\n${title}\n${'─'.repeat(70)}`);
  for (const l of lines) console.error(l);
  console.error('');
  process.exit(1);
}

const raw = (process.env.DATABASE_URL || process.env.DIRECT_URL || '').trim();

if (!raw) {
  fail('DATABASE_URL не задан', [
    'В файле .env в корне проекта нет строки DATABASE_URL.',
    '',
    'Откуда взять настоящее значение — см. ниже, раздел «Как получить URL».',
  ]);
}

if (PLACEHOLDERS.some((p) => raw.toLowerCase().includes(p.toLowerCase()))) {
  fail('В .env стоит заглушка, а не настоящий адрес базы', [
    `Сейчас там: ${raw}`,
    '',
    'Это шаблон из примера, а не рабочие учётные данные. Придумывать их',
    'самостоятельно не нужно и нельзя: база уже существует, и подключаться',
    'надо именно к ней — к той, с которой работает сайт.',
    '',
    'КАК ПОЛУЧИТЬ URL',
    '',
    '  Вариант 1, надёжный — вытянуть переменные прямо из Vercel:',
    '      npm i -g vercel',
    '      vercel link          # привязать папку к проекту',
    '      vercel env pull .env # записать реальные значения в .env',
    '',
    '  Вариант 2, вручную — Vercel, проект bazariara, Settings,',
    '  Environment Variables, переменная DATABASE_URL, окружение',
    '  Production. Скопировать значение целиком.',
    '',
    'Первый вариант лучше тем, что исключает опечатку и подтягивает',
    'ровно то окружение, в котором работает сайт.',
  ]);
}

let parsed: URL;
try {
  parsed = new URL(raw);
} catch {
  fail('DATABASE_URL не похож на адрес', [
    `Сейчас там: ${raw.slice(0, 60)}${raw.length > 60 ? '…' : ''}`,
    '',
    'Ожидается строка вида postgresql://пользователь:пароль@хост/база?sslmode=require',
    'Частая причина — значение осталось в кавычках или скопировано не целиком.',
  ]);
}

const sql = postgres(raw, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });

async function main() {
  console.log('\nПОДКЛЮЧЕНИЕ');
  console.log('─'.repeat(70));
  console.log(`  хост:         ${parsed.hostname}`);
  console.log(`  пользователь: ${parsed.username || '(не указан)'}`);

  const [db] = await sql`SELECT current_database() AS db, version() AS v`;
  console.log(`  база:         ${db.db}`);
  console.log(`  сервер:       ${String(db.v).split(' ').slice(0, 2).join(' ')}`);

  // Ветка Neon обычно видна в имени хоста
  const branch = parsed.hostname.match(/^(ep-[a-z0-9-]+)/i);
  if (branch) console.log(`  endpoint:     ${branch[1]}  ← сверьте с Vercel`);

  console.log('\nЧТО В БАЗЕ');
  console.log('─'.repeat(70));

  const tables = ['products', 'posts', 'producers', 'categories', 'post_tags'];
  for (const t of tables) {
    try {
      const [{ n }] = await sql.unsafe(`SELECT count(*)::int AS n FROM ${t}`);
      console.log(`  ${t.padEnd(14)} ${String(n).padStart(6)} строк`);
    } catch {
      console.log(`  ${t.padEnd(14)}      — таблицы нет`);
    }
  }

  let products = 0;
  try {
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM products`;
    products = n;
  } catch { /* таблицы нет */ }

  console.log('');
  if (products === 0) {
    console.log('ВНИМАНИЕ: товаров в базе ноль.');
    console.log('Скорее всего это пустая или свежесозданная база, а не та,');
    console.log('с которой работает сайт. Сверьте хост и endpoint с Vercel');
    console.log('до того, как запускать что-либо с флагом --apply.');
  } else {
    console.log('Похоже на рабочую базу.');
    console.log('Сверьте хост и имя базы с Vercel, Settings, Environment Variables,');
    console.log('переменная DATABASE_URL, окружение Production. Совпало — можно');
    console.log('запускать правки. Не совпало — остановитесь: скрипт обновит не ту');
    console.log('базу и не сообщит об этом, потому что с его точки зрения всё в порядке.');
  }

  console.log('');
  await sql.end();
}

main().catch(async (e) => {
  console.error('\nНе удалось подключиться:', e?.message || e);
  console.error('\nЧастые причины: неверный пароль, база засыпает и нужен');
  console.error('повторный запуск, отсутствует ?sslmode=require в конце адреса.');
  await sql.end().catch(() => {});
  process.exit(1);
});
