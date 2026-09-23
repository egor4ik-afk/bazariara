/**
 * migrate-full-db.ts — Полный перенос БД (схема + данные) SOURCE -> TARGET
 * БЕЗ pg_dump/pg_restore — только SQL через пакет `postgres`.
 *
 * Нужен для сред, где нет системного pg_dump подходящей версии (как в вашем
 * nix-канале: сервер Neon на PG17, а доступен только PG16).
 *
 * Запуск: npx tsx migrate-full-db.ts
 *
 * Переносится: обычные таблицы схемы public, их колонки, PRIMARY KEY,
 * UNIQUE, FOREIGN KEY, CHECK constraints, обычные индексы, ENUM-типы,
 * автоинкрементные serial/identity колонки (с корректным сбросом sequence) —
 * вместе с данными.
 *
 * НЕ переносится: views, materialized views, функции/триггеры,
 * RLS-политики, extensions, domain-типы, partitioned tables,
 * exclusion constraints. Если что-то из этого есть в схеме — перенесите
 * вручную (psql \d+ на SOURCE -> применить DDL на TARGET).
 *
 * Идемпотентен: данные TRUNCATE перед вставкой, объекты создаются через
 * IF NOT EXISTS / EXCEPTION-обёртки — повторный запуск безопасен.
 */
