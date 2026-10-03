-- Подкатегории, которых не хватает (октябрь 2026).
-- На главной под «Туризмом» не было ни одной подкатегории: у страниц
-- «Палатки», «Термосы», «Дрова» не было своих адресов, хотя товары по ним
-- стоят на 3–4 местах в поиске.
--
-- Сначала пробный прогон — он напечатает, что именно будет сделано:
--   node db/run-sql.mjs db/2026-10-subcategories.sql --dry-run
--
-- Что делает:
--   1. Считает по каждой категории товары без подкатегории.
--   2. В «Туризме» проставляет подкатегорию по названию товара — ТОЛЬКО тем,
--      у кого она пустая. Заполненные не трогает.
--   3. Для всех категорий создаёт недостающие строки в subcategories из того,
--      что реально записано у товаров. Ключ = название в нижнем регистре,
--      пробелы → дефисы: по этому правилу каталог находит товары.
-- Повторный запуск ничего не дублирует.

BEGIN;

-- 1. Где товары без подкатегории
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT category_key, count(*) AS n FROM products
    WHERE source = 'gorgia' AND COALESCE(sub_category, '') = ''
      AND category_key IN (SELECT category_key FROM categories)
    GROUP BY 1 ORDER BY 2 DESC
  LOOP
    RAISE NOTICE 'без подкатегории: % — % тов.', r.category_key, r.n;
  END LOOP;
END $$;

-- 2. Туризм: подкатегория по названию. Порядок важен — первое совпадение
--    побеждает («термокружка» — это термос, а не посуда). Регистр первой буквы
--    указан явно ([Пп]алатк): ~* и lower() не понимают кириллицу, если база
--    создана с локалью C.
CREATE TEMP TABLE hiking_map (ord int, sub text, sub_en text, sub_ka text, re text) ON COMMIT DROP;
INSERT INTO hiking_map VALUES
  (1,  'Палатки',              'Tents',                      'კარვები',            '[Пп]алатк'),
  (2,  'Спальные мешки',       'Sleeping bags',              'საძილე ტომრები',     '[Сс]пальн'),
  (3,  'Термосы',              'Thermoses',                  'თერმოსები',          '[Тт]ермос|[Тт]ермокруж|[Тт]ермобутыл'),
  (4,  'Мангалы и грили',      'Grills and BBQ',             'მაყალები',           '[Мм]ангал|[Гг]риль|[Бб]арбекю|[Шш]ампур'),
  (5,  'Дрова и розжиг',       'Firewood and fire starters', 'შეშა',               '[Дд]ров|[Рр]озжиг|[Уу]голь'),
  (6,  'Горелки и газ',        'Burners and gas',            NULL,                 '[Гг]орелк|[Бб]аллон|[Пп]литк'),
  (7,  'Фонари',               'Lanterns and headlamps',     'ფარნები',            '[Фф]онар|[Нн]алобн'),
  (8,  'Рюкзаки',              'Backpacks',                  'ზურგჩანთები',        '[Рр]юкзак'),
  (9,  'Коврики',              'Sleeping mats',              NULL,                 '[Кк]оврик|[Кк]аремат'),
  (10, 'Туристическая мебель', 'Camping furniture',          'ტურისტული ავეჯი',    '[Сс]тул|[Кк]ресл|[Шш]езлонг|(^|[^а-яА-Я])[Сс]тол([^оО]|$)');

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    WITH pick AS (
      SELECT DISTINCT ON (p.id) p.id, m.sub, m.sub_en, m.sub_ka
      FROM products p
      JOIN hiking_map m ON COALESCE(p.name_ru, p.name) ~ m.re
      WHERE p.category_key = 'hiking' AND p.source = 'gorgia' AND COALESCE(p.sub_category, '') = ''
      ORDER BY p.id, m.ord
    ), upd AS (
      UPDATE products p
      SET sub_category = pick.sub, sub_category_en = pick.sub_en, sub_category_ka = pick.sub_ka
      FROM pick WHERE p.id = pick.id
      RETURNING p.sub_category
    )
    SELECT sub_category, count(*) AS n FROM upd GROUP BY 1 ORDER BY 2 DESC
  LOOP
    RAISE NOTICE 'туризм: «%» проставлена % тов.', r.sub_category, r.n;
  END LOOP;

  FOR r IN
    SELECT COALESCE(name_ru, name) AS n FROM products
    WHERE category_key = 'hiking' AND source = 'gorgia' AND COALESCE(sub_category, '') = ''
    ORDER BY 1 LIMIT 15
  LOOP
    RAISE NOTICE 'туризм, осталось без подкатегории: %', r.n;
  END LOOP;
END $$;

-- 3. Недостающие строки в subcategories — для всех категорий
DO $$
DECLARE r record;
BEGIN
  -- Ключ подкатегории уникален на весь сайт: если он уже занят в другой
  -- категории, такую строку создать нельзя — сообщаем, а не молчим.
  FOR r IN
    SELECT DISTINCT p.category_key, p.sub_category, s.category_key AS taken_by
    FROM products p
    JOIN subcategories s ON s.key = lower(replace(p.sub_category, ' ', '-'))
                        AND s.category_key <> p.category_key
    WHERE p.source = 'gorgia' AND COALESCE(p.sub_category, '') <> ''
      AND p.category_key IN (SELECT category_key FROM categories)
      AND NOT EXISTS (SELECT 1 FROM subcategories x
                      WHERE x.category_key = p.category_key AND x.name = p.sub_category)
  LOOP
    RAISE NOTICE 'пропущено: «%» в % — ключ уже занят категорией %', r.sub_category, r.category_key, r.taken_by;
  END LOOP;

  FOR r IN
    WITH need AS (
      SELECT DISTINCT ON (lower(replace(p.sub_category, ' ', '-')))
             p.category_key, lower(replace(p.sub_category, ' ', '-')) AS key,
             p.sub_category AS name, p.sub_category_en AS name_en, p.sub_category_ka AS name_ka
      FROM products p
      WHERE p.source = 'gorgia' AND COALESCE(p.sub_category, '') <> ''
        AND p.category_key IN (SELECT category_key FROM categories)
        AND NOT EXISTS (SELECT 1 FROM subcategories s
                        WHERE s.category_key = p.category_key AND s.name = p.sub_category)
      ORDER BY lower(replace(p.sub_category, ' ', '-')), p.category_key
    ), ins AS (
      INSERT INTO subcategories (category_key, key, name, name_en, name_ka)
      SELECT category_key, key, name, name_en, name_ka FROM need
      ON CONFLICT (key) DO NOTHING
      RETURNING category_key, name
    )
    SELECT * FROM ins ORDER BY 1, 2
  LOOP
    RAISE NOTICE 'новая подкатегория: % → «%»', r.category_key, r.name;
  END LOOP;
END $$;

COMMIT;
