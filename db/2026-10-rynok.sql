-- Раздел «Рынок»: овощи и фрукты (октябрь 2026).
-- Запускайте, когда будут готовы первые товары: категория без товаров на сайте
-- не показывается на главной, но попадёт в боковое меню.
--
-- Ключ категории rynok, название «Овощи и фрукты»: так её ищут
-- («овощи и фрукты тбилиси»), и это же название станет H1 и title страницы.
-- На главной блок называется «Рынок».

BEGIN;

INSERT INTO categories (category_key, name, name_en, name_ka)
VALUES ('rynok', 'Овощи и фрукты', 'Fruit and vegetables', 'ხილი და ბოსტნეული')
ON CONFLICT (category_key) DO UPDATE
  SET name = EXCLUDED.name, name_en = EXCLUDED.name_en, name_ka = EXCLUDED.name_ka;

-- Ключ подкатегории = название в нижнем регистре, пробелы → дефисы:
-- по этому правилу каталог находит товары (products.sub_category = 'Овощи').
INSERT INTO subcategories (category_key, key, name, name_en, name_ka) VALUES
  ('rynok', 'овощи', 'Овощи', 'Vegetables', 'ბოსტნეული'),
  ('rynok', 'фрукты', 'Фрукты', 'Fruit', 'ხილი')
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Проверка: обе подкатегории должны быть в rynok.
-- SELECT key, category_key FROM subcategories WHERE key IN ('овощи', 'фрукты');

-- Шаблон товара. Обязательно: source = 'gorgia' (по нему фильтрует каталог,
-- историческое имя), image_url (товары без фото каталог не показывает),
-- external_id вида rynok_<что-то уникальное>. Единицу измерения пишите в названии.
--
-- INSERT INTO products (source, external_id, category_key, currency, name, name_ru,
--   description, description_ru, price, in_stock, category, category_en, category_ka,
--   sub_category, sub_category_en, sub_category_ka, image_url, images)
-- VALUES ('gorgia', 'rynok_tykva', 'rynok', 'GEL', 'Тыква, 1 кг', 'Тыква, 1 кг',
--   'Описание…', 'Описание…', 0, TRUE, 'Овощи и фрукты', 'Fruit and vegetables', 'ხილი და ბოსტნეული',
--   'Овощи', 'Vegetables', 'ბოსტნეული', 'https://cdn.relaxdev.ru/…', '["https://cdn.relaxdev.ru/…"]'::jsonb);
