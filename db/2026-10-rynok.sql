-- Раздел «Рынок»: овощи, фрукты, зелень и сыр (октябрь 2026).
--
--   node db/run-sql.mjs db/2026-10-rynok.sql --dry-run
--   node db/run-sql.mjs db/2026-10-rynok.sql
--
-- Категория rynok, название «Рынок: овощи, фрукты и сыр» — оно станет H1 и title страницы
-- категории. Подкатегории (Овощи, Фрукты, Зелень, Сыр) получают свои страницы:
-- «Овощи — купить в Тбилиси» и т.д. На главной блок называется «Рынок».
--
-- ТОВАРЫ ЗАЛИВАЮТСЯ ЧЕРНОВИКАМИ (in_stock = FALSE):
--   * цены — мой ориентир, их нужно проверить;
--   * фото — заглушка «Фото скоро появится» (/placeholder-product.svg).
-- На сайте товары видны, но с «нет в наличии», купить их нельзя. Блок «Рынок»
-- на главной появится сам, когда у первого товара будет настоящее фото: товары
-- с заглушкой главная не показывает.
--
-- Повторный запуск товары НЕ перезаписывает (ON CONFLICT DO NOTHING): правки
-- цен и фото из админки не потеряются.

BEGIN;

INSERT INTO categories (category_key, name, name_en, name_ka)
VALUES ('rynok', 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი')
ON CONFLICT (category_key) DO UPDATE
  SET name = EXCLUDED.name, name_en = EXCLUDED.name_en, name_ka = EXCLUDED.name_ka;

-- Ключ подкатегории = название в нижнем регистре, пробелы → дефисы.
INSERT INTO subcategories (category_key, key, name, name_en, name_ka) VALUES
  ('rynok', 'овощи', 'Овощи', 'Vegetables', 'ბოსტნეული'),
  ('rynok', 'фрукты', 'Фрукты', 'Fruit', 'ხილი'),
  ('rynok', 'зелень', 'Зелень', 'Fresh herbs', 'მწვანილი'),
  ('rynok', 'сыр', 'Сыр', 'Cheese', 'ყველი')
ON CONFLICT (key) DO NOTHING;

INSERT INTO products (
  source, external_id, category_key, currency,
  name, name_ru, description, description_ru,
  price, in_stock,
  category, category_en, category_ka,
  sub_category, sub_category_en, sub_category_ka,
  image_url, images
) VALUES
  ('gorgia', 'rynok_pomidory', 'rynok', 'GEL', 'Помидоры, 1 кг', 'Помидоры, 1 кг', 'Спелые помидоры для салата с огурцами и орехами, аджапсандали и соусов.', 'Спелые помидоры для салата с огурцами и орехами, аджапсандали и соусов.', 4, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_ogurcy', 'rynok', 'GEL', 'Огурцы, 1 кг', 'Огурцы, 1 кг', 'Хрустящие огурцы для салатов и закуски.', 'Хрустящие огурцы для салатов и закуски.', 3.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_kartofel', 'rynok', 'GEL', 'Картофель, 1 кг', 'Картофель, 1 кг', 'Картофель на каждый день: для жарки, пюре и супов.', 'Картофель на каждый день: для жарки, пюре и супов.', 1.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_luk', 'rynok', 'GEL', 'Лук репчатый, 1 кг', 'Лук репчатый, 1 кг', 'Репчатый лук — основа почти любого блюда, от чахохбили до харчо.', 'Репчатый лук — основа почти любого блюда, от чахохбили до харчо.', 1.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_morkov', 'rynok', 'GEL', 'Морковь, 1 кг', 'Морковь, 1 кг', 'Сладкая морковь для супов, рагу и салатов.', 'Сладкая морковь для супов, рагу и салатов.', 2, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_kapusta', 'rynok', 'GEL', 'Капуста белокочанная, 1 кг', 'Капуста белокочанная, 1 кг', 'Для салатов, тушения и квашения.', 'Для салатов, тушения и квашения.', 1.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_baklazhany', 'rynok', 'GEL', 'Баклажаны, 1 кг', 'Баклажаны, 1 кг', 'Для бадриджани с ореховой пастой, аджапсандали и запекания на гриле.', 'Для бадриджани с ореховой пастой, аджапсандали и запекания на гриле.', 3, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_perec-bolgarskiy', 'rynok', 'GEL', 'Перец болгарский, 1 кг', 'Перец болгарский, 1 кг', 'Сладкий перец для салатов, фаршировки и аджапсандали.', 'Сладкий перец для салатов, фаршировки и аджапсандали.', 4, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_perec-ostryy', 'rynok', 'GEL', 'Перец острый, 250 г', 'Перец острый, 250 г', 'Острый перец для аджики, соусов и маринадов.', 'Острый перец для аджики, соусов и маринадов.', 2, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_tykva', 'rynok', 'GEL', 'Тыква, 1 кг', 'Тыква, 1 кг', 'Тыква для запекания, супа и каши, а целиком — для фонаря на Хэллоуин.', 'Тыква для запекания, супа и каши, а целиком — для фонаря на Хэллоуин.', 2, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_chesnok', 'rynok', 'GEL', 'Чеснок, 250 г', 'Чеснок, 250 г', 'Чеснок для соусов, мяса и заготовок.', 'Чеснок для соусов, мяса и заготовок.', 3, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_svekla', 'rynok', 'GEL', 'Свёкла, 1 кг', 'Свёкла, 1 кг', 'Для пхали, борща, запекания и салатов.', 'Для пхали, борща, запекания и салатов.', 1.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_kabachki', 'rynok', 'GEL', 'Кабачки, 1 кг', 'Кабачки, 1 кг', 'Молодые кабачки для жарки, рагу и запекания.', 'Молодые кабачки для жарки, рагу и запекания.', 2.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Овощи', 'Vegetables', 'ბოსტნეული', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_kinza', 'rynok', 'GEL', 'Кинза, пучок', 'Кинза, пучок', 'Без кинзы не обходится ни харчо, ни пхали, ни ткемали.', 'Без кинзы не обходится ни харчо, ни пхали, ни ткемали.', 1, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Зелень', 'Fresh herbs', 'მწვანილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_petrushka', 'rynok', 'GEL', 'Петрушка, пучок', 'Петрушка, пучок', 'Для салатов, супов и соусов.', 'Для салатов, супов и соусов.', 1, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Зелень', 'Fresh herbs', 'მწვანილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_ukrop', 'rynok', 'GEL', 'Укроп, пучок', 'Укроп, пучок', 'Для салатов, супов и заготовок.', 'Для салатов, супов и заготовок.', 1, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Зелень', 'Fresh herbs', 'მწვანილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_tarhun', 'rynok', 'GEL', 'Тархун, пучок', 'Тархун, пучок', 'Тархун (эстрагон) для чакапули, салатов и домашнего лимонада.', 'Тархун (эстрагон) для чакапули, салатов и домашнего лимонада.', 1.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Зелень', 'Fresh herbs', 'მწვანილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_zelenyy-luk', 'rynok', 'GEL', 'Зелёный лук, пучок', 'Зелёный лук, пучок', 'Для салатов и к столу.', 'Для салатов и к столу.', 1, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Зелень', 'Fresh herbs', 'მწვანილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_yabloki', 'rynok', 'GEL', 'Яблоки, 1 кг', 'Яблоки, 1 кг', 'Сезонные яблоки — свежие, для выпечки и компота.', 'Сезонные яблоки — свежие, для выпечки и компота.', 3, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_grushi', 'rynok', 'GEL', 'Груши, 1 кг', 'Груши, 1 кг', 'Сочные груши к столу и для десертов.', 'Сочные груши к столу и для десертов.', 4, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_vinograd', 'rynok', 'GEL', 'Виноград, 1 кг', 'Виноград, 1 кг', 'Столовый виноград осеннего урожая.', 'Столовый виноград осеннего урожая.', 5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_hurma', 'rynok', 'GEL', 'Хурма, 1 кг', 'Хурма, 1 кг', 'Сладкая спелая хурма, сезон — поздняя осень.', 'Сладкая спелая хурма, сезон — поздняя осень.', 4, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_granat', 'rynok', 'GEL', 'Гранат, 1 кг', 'Гранат, 1 кг', 'Для сока, салатов, соусов к мясу и просто к столу.', 'Для сока, салатов, соусов к мясу и просто к столу.', 5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_ayva', 'rynok', 'GEL', 'Айва, 1 кг', 'Айва, 1 кг', 'Ароматная айва для варенья, компота и запекания с мясом.', 'Ароматная айва для варенья, компота и запекания с мясом.', 3, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_feyhoa', 'rynok', 'GEL', 'Фейхоа, 1 кг', 'Фейхоа, 1 кг', 'Фейхоа созревает в Грузии осенью. Едят свежей или перетирают с сахаром.', 'Фейхоа созревает в Грузии осенью. Едят свежей или перетирают с сахаром.', 6, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_mandariny', 'rynok', 'GEL', 'Мандарины, 1 кг', 'Мандарины, 1 кг', 'Сладкие мандарины, сезон — с ноября.', 'Сладкие мандарины, сезон — с ноября.', 3.5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_kivi', 'rynok', 'GEL', 'Киви, 1 кг', 'Киви, 1 кг', 'Киви позднего осеннего сбора.', 'Киви позднего осеннего сбора.', 5, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Фрукты', 'Fruit', 'ხილი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_suluguni', 'rynok', 'GEL', 'Сулугуни, 500 г', 'Сулугуни, 500 г', 'Рассольный сыр для хачапури, жарки на кеци или просто к столу.', 'Рассольный сыр для хачапури, жарки на кеци или просто к столу.', 9, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Сыр', 'Cheese', 'ყველი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_suluguni-kopchenyy', 'rynok', 'GEL', 'Сулугуни копчёный, 500 г', 'Сулугуни копчёный, 500 г', 'Копчёный сулугуни — к вину, на закуску и в выпечку.', 'Копчёный сулугуни — к вину, на закуску и в выпечку.', 11, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Сыр', 'Cheese', 'ყველი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_imeruli', 'rynok', 'GEL', 'Имерули, 500 г', 'Имерули, 500 г', 'Молодой мягкий сыр, основа имеретинского хачапури.', 'Молодой мягкий сыр, основа имеретинского хачапури.', 8, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Сыр', 'Cheese', 'ყველი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb),
  ('gorgia', 'rynok_guda', 'rynok', 'GEL', 'Гуда (тушинский сыр), 500 г', 'Гуда (тушинский сыр), 500 г', 'Выдержанный овечий сыр из Тушетии с ярким солоноватым вкусом.', 'Выдержанный овечий сыр из Тушетии с ярким солоноватым вкусом.', 15, FALSE, 'Рынок: овощи, фрукты и сыр', 'Market: fruit, vegetables and cheese', 'ბაზარი: ხილი, ბოსტნეული და ყველი', 'Сыр', 'Cheese', 'ყველი', '/placeholder-product.svg', '["/placeholder-product.svg"]'::jsonb)
ON CONFLICT (external_id) DO NOTHING;

-- Если ключ «овощи»/«фрукты»/«зелень»/«сыр» уже был занят другой категорией,
-- подкатегория не создастся — предупредим.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT key, category_key FROM subcategories
           WHERE key IN ('овощи', 'фрукты', 'зелень', 'сыр') AND category_key <> 'rynok'
  LOOP
    RAISE NOTICE 'внимание: ключ «%» занят категорией %, подкатегория в rynok не создана', r.key, r.category_key;
  END LOOP;
END $$;

COMMIT;

-- ── Потом ────────────────────────────────────────────────────────────────────
-- Цена и фото меняются в админке. Включить в продажу:
--   всё, у чего уже есть настоящее фото:
--     UPDATE products SET in_stock = TRUE, updated_at = now()
--     WHERE category_key = 'rynok' AND image_url NOT LIKE '/placeholder%';
--   один товар:
--     UPDATE products SET in_stock = TRUE, updated_at = now() WHERE external_id = 'rynok_tykva';
