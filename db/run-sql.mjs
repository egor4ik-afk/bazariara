#!/usr/bin/env node
// Заливка SQL-файла в базу сайта. psql не нужен — работает на пакете postgres
// из зависимостей проекта.
//
//   node db/run-sql.mjs db/2026-10-newyear.sql --dry-run   пробный прогон, всё откатывается
//   node db/run-sql.mjs db/2026-10-newyear.sql             по-настоящему, спросит подтверждение
//   node db/run-sql.mjs db/2026-10-newyear.sql --yes       без вопроса (для CI)
//
// Адрес базы — из DATABASE_URL, а если его нет в окружении, из .env.local,
// .env.production.local, .env.production или .env в корне проекта.

import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import postgres from 'postgres';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const DRY = args.includes('--dry-run');
const YES = args.includes('--yes');

if (!file) {
  console.error('Укажите файл: node db/run-sql.mjs db/<файл>.sql [--dry-run] [--yes]');
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`Нет такого файла: ${file}`);
  process.exit(1);
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return { url: process.env.DATABASE_URL, from: 'окружения' };
  for (const f of ['.env.local', '.env.production.local', '.env.production', '.env']) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) return { url: m[1].replace(/^['"]|['"]$/g, ''), from: f };
    }
  }
  return null;
}

// Та же логика SSL, что в lib/db.ts: база relaxdev работает без SSL,
// облачные (Neon, Supabase, AWS) — только с ним; sslmode в адресе главнее.
function sslFor(url) {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get('sslmode');
    if (mode === 'disable') return false;
    if (mode && mode !== 'prefer' && mode !== 'allow') return 'require';
    return /(^|\.)(neon\.tech|supabase\.co|supabase\.com|amazonaws\.com)$/.test(u.hostname) ? 'require' : false;
  } catch {
    return false;
  }
}

const db = loadDatabaseUrl();
if (!db || !db.url.startsWith('postgres')) {
  console.error('Не нашёл DATABASE_URL. Запустите так:');
  console.error(`  DATABASE_URL='postgres://user:pass@host:5432/db' node db/run-sql.mjs ${file}`);
  process.exit(1);
}

const target = (() => {
  const u = new URL(db.url);
  return `${u.hostname}:${u.port || 5432}/${u.pathname.slice(1)} (пользователь ${u.username}, адрес из ${db.from})`;
})();

// BEGIN/COMMIT из файла убираем: весь файл выполняется в одной транзакции
// скрипта. Ошибка в любой строке откатывает всё, в базе не остаётся половины.
const body = readFileSync(file, 'utf8').replace(/^\s*(BEGIN|COMMIT)\s*;\s*$/gim, '');

console.log(`Файл:  ${file}`);
console.log(`База:  ${target}`);
console.log(`Режим: ${DRY ? 'пробный прогон, изменения откатятся' : 'ЗАПИСЬ в базу'}`);

if (!DRY && !YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Выполнить? (y/N) ')).trim().toLowerCase();
  rl.close();
  if (answer !== 'y' && answer !== 'д' && answer !== 'yes' && answer !== 'да') {
    console.log('Отменено.');
    process.exit(0);
  }
}

const sql = postgres(db.url, { ssl: sslFor(db.url), max: 1, onnotice: () => {} });

// Сводка «было → стало»: число товаров по категориям, категорий, подкатегорий
// и статей. Считается внутри той же транзакции, поэтому работает и в пробном прогоне.
const LABELS = { categories: 'категорий', subcategories: 'подкатегорий', posts: 'статей' };
async function snapshot(tx) {
  const out = {};
  const rows = await tx`SELECT COALESCE(category_key, '—') AS k, count(*)::int AS n FROM products GROUP BY 1`;
  for (const r of rows) out[`товаров в ${r.k}`] = r.n;
  for (const t of Object.keys(LABELS)) {
    const [{ ok }] = await tx`SELECT to_regclass(${t}) IS NOT NULL AS ok`;
    if (!ok) continue;
    const [{ n }] = await tx.unsafe(`SELECT count(*)::int AS n FROM ${t}`);
    out[LABELS[t]] = n;
  }
  return out;
}

const ROLLBACK = Symbol('dry-run');
try {
  const started = Date.now();
  await sql.begin(async (tx) => {
    const before = await snapshot(tx);
    // simple(): протокол простых запросов, несколько команд в одной строке.
    await tx.unsafe(body).simple();
    const after = await snapshot(tx);

    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    const changed = keys.filter((k) => (before[k] ?? 0) !== (after[k] ?? 0));
    if (changed.length) {
      for (const k of changed) console.log(`  ${k}: ${before[k] ?? 0} → ${after[k] ?? 0}`);
    } else {
      console.log('  Количество строк не изменилось (могли обновиться существующие).');
    }
    if (DRY) throw ROLLBACK;
  });
  console.log(`Готово за ${Date.now() - started} мс, изменения записаны.`);
} catch (e) {
  if (e === ROLLBACK) {
    console.log('Пробный прогон прошёл без ошибок, всё откатено. Для записи запустите без --dry-run.');
  } else {
    console.error(`\nОшибка: ${e.message}`);
    if (e.position) {
      const pos = Number(e.position);
      console.error(`Место в файле: …${body.slice(Math.max(0, pos - 80), pos + 40).replace(/\s+/g, ' ')}…`);
    }
    console.error('Транзакция откатилась, в базе ничего не изменилось.');
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
