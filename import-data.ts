/**
 * seed-chventan.ts — товары фермерского бренда CH’VENTAN.
 *
 * ЗАПУСКАТЬ ИЗ КОРНЯ ПРОЕКТА bazariara:
 *
 *     cd ~/bazariara          # там, где лежит package.json с "postgres"
 *     npx tsx seed-chventan.ts
 *
 * Ошибка «Cannot find module 'postgres'» из прошлого запуска — не про код.
 * В стеке видно requireStack: ['/home/user/orders/seed-chventan.ts'].
 * Скрипт лежал в проекте orders, а пакет postgres стоит в bazariara.
 * Node ищет модуль в node_modules рядом со скриптом и выше по дереву —
 * в orders его нет. Скопируйте файл в корень bazariara и запустите оттуда.
 *
 * Если всё же нужно гонять из другого места:  npm i postgres dotenv
 *
 * Скрипт сам создаёт колонки и категории — отдельный SQL не нужен.
 */

import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден. Проверьте .env в корне проекта.');
  process.exit(1);
}

// ssl: 'require' — как в lib/db.ts. Без него Neon рвёт соединение.
const sql = postgres(dbUrl, { ssl: 'require', max: 5, idle_timeout: 20 });

const FARMER = 'CH’VENTAN';
const FARMER_SLUG = 'chventan';

const IMG = {
  tkemali: 'https://cdn.relaxdev.ru/bazariara/admin/1786624145879_photo_5472130159126190823_w.jpg',
  corn:    'https://cdn.relaxdev.ru/bazariara/admin/1786643514347_IMG_2694.jpg',
  tea:     'https://cdn.relaxdev.ru/bazariara/admin/1786629867533_IMG_2688.jpg',
  wine:    'https://cdn.relaxdev.ru/bazariara/admin/1786643785003_IMG_2714.jpg',
};

type Seed = {
  external_id: string;
  category_key: string;
  category: string; category_en: string; category_ka: string;
  sub_category?: string; sub_category_en?: string; sub_category_ka?: string;
  name_ru: string; name_en: string; name_ka: string;
  description_ru: string; description_en: string; description_ka: string;
  price: string | null;
  in_stock: boolean;
  sku: string;
  image_url: string;
};

const CATEGORIES = [
  { key: 'spetsii', ru: 'Специи',       en: 'Spices',       ka: 'სანელებლები' },
  { key: 'chay',    ru: 'Чай',          en: 'Tea',          ka: 'ჩაი' },
  { key: 'vino',    ru: 'Вино',         en: 'Wine',         ka: 'ღვინო' },
  { key: 'bakalea', ru: 'Бакалея',      en: 'Groceries',    ka: 'ბაკალეა' },
];

const products: Seed[] = [
  {
    external_id: 'chventan_tkemali_500',
    category_key: 'spetsii', category: 'Специи', category_en: 'Spices', category_ka: 'სანელებლები',
    sub_category: 'Соусы', sub_category_en: 'Sauces', sub_category_ka: 'სოუსები',
    name_ru: 'Ткемали CH’VENTAN, 500 мл',
    name_en: 'Tkemali CH’VENTAN, 500 ml',
    name_ka: 'ტყემალი CH’VENTAN, 500 მლ',
    description_ru:
      'Натуральный грузинский соус ткемали от фермерского хозяйства CH’VENTAN из села Мсхалгори в Кахетии.\n\n' +
      'Основа — настоящая грузинская слива, к ней добавляются традиционные травы и специи. Задача была сделать ткемали таким, каким его едят в грузинских семьях: с живой кислотностью, ароматом сливы и трав, без ощущения промышленного соуса.\n\n' +
      'Производство идёт небольшими партиями и зависит от сезона: сколько дала земля, столько и получилось. Поэтому вкус от партии к партии может немного отличаться — это особенность фермерского продукта, а не недостаток.\n\n' +
      'Подаётся к мясу, птице, картофелю, овощам на гриле. Хорошо работает и как основа для маринада. Объём 500 мл — формат для тех, кто готовит часто.',
    description_en:
      'Natural Georgian tkemali sauce from the CH’VENTAN farm in Mskhalgori, Kakheti. Made from real Georgian plums with traditional herbs and spices, in small seasonal batches. Bright natural acidity, plum and herb aroma, nothing industrial about it. Serve with meat, poultry, potatoes and grilled vegetables, or use as a marinade base. 500 ml.',
    description_ka:
      'ნატურალური ქართული ტყემლის სოუსი ოჯახური მეურნეობიდან CH’VENTAN, სოფელი მსხალგორი, კახეთი. მზადდება ნამდვილი ქართული ქლიავისგან, ტრადიციულ მწვანილთან და სანელებლებთან ერთად, მცირე პარტიებად. მიირთვით ხორცთან, ფრინველთან, კარტოფილთან და შემწვარ ბოსტნეულთან. 500 მლ.',
    price: '15.00', in_stock: true, sku: 'CHV-TKM-500', image_url: IMG.tkemali,
  },
  {
    external_id: 'chventan_tkemali_310',
    category_key: 'spetsii', category: 'Специи', category_en: 'Spices', category_ka: 'სანელებლები',
    sub_category: 'Соусы', sub_category_en: 'Sauces', sub_category_ka: 'სოუსები',
    name_ru: 'Ткемали CH’VENTAN, 310 мл',
    name_en: 'Tkemali CH’VENTAN, 310 ml',
    name_ka: 'ტყემალი CH’VENTAN, 310 მლ',
    description_ru:
      'Тот же фермерский ткемали от CH’VENTAN, что и в большом формате, но в бутылке 310 мл — удобно попробовать или увезти с собой.\n\n' +
      'Соус готовится из настоящей грузинской сливы с травами и специями, небольшими партиями, в хозяйстве в кахетинском селе Мсхалгори. Сохранены естественная кислотность и аромат — тот самый вкус, ради которого ткемали и едят.\n\n' +
      'Формат 310 мл проходит в багаж и хорошо подходит как гостинец: компактный, не течёт, не требует холодильника до вскрытия.',
    description_en:
      'The same CH’VENTAN farm tkemali in a smaller 310 ml bottle — easy to try or to take home. Real Georgian plums, herbs and spices, made in small batches in Mskhalgori, Kakheti. Fits in checked luggage and needs no refrigeration until opened.',
    description_ka:
      'იგივე ფერმერული ტყემალი CH’VENTAN-სგან, 310 მლ ბოთლში — მოსახერხებელია გასასინჯად ან თან წასაღებად. ნამდვილი ქართული ქლიავი, მწვანილი და სანელებლები, მცირე პარტიები.',
    price: '10.00', in_stock: true, sku: 'CHV-TKM-310', image_url: IMG.tkemali,
  },
  {
    external_id: 'chventan_corn_flour_1kg',
    category_key: 'bakalea', category: 'Бакалея', category_en: 'Groceries', category_ka: 'ბაკალეა',
    sub_category: 'Мука и крупы', sub_category_en: 'Flour & grains', sub_category_ka: 'ფქვილი და მარცვლეული',
    name_ru: 'Кукурузная мука CH’VENTAN, 1 кг',
    name_en: 'Corn Flour CH’VENTAN, 1 kg',
    name_ka: 'სიმინდის ფქვილი CH’VENTAN, 1 კგ',
    description_ru:
      'Натуральная кукурузная мука местного помола, 1 кг.\n\n' +
      'Основа двух главных блюд грузинского стола: мчади — кукурузных лепёшек, которые пекут на сковороде и подают к сыру и лобио, и гоми — густой кукурузной каши, заменяющей в Западной Грузии хлеб.\n\n' +
      'Мука не рафинированная, поэтому у неё сохраняется собственный кукурузный вкус и лёгкая зернистость. Для мчади это как раз то, что нужно: тесто получается плотным и держит форму.\n\n' +
      'Подходит также для поленты, кукурузного хлеба и панировки. Хранить в сухом месте в закрытой таре.',
    description_en:
      'Natural locally milled corn flour, 1 kg. The base of two staples of the Georgian table: mchadi, the pan-baked corn breads served with cheese and lobio, and ghomi, the thick corn porridge that replaces bread in western Georgia. Unrefined, so it keeps its own corn flavour and slight grit. Also works for polenta, corn bread and coating.',
    description_ka:
      'ნატურალური სიმინდის ფქვილი ადგილობრივი წისქვილიდან, 1 კგ. მჭადისა და ღომის საფუძველი. არარაფინირებული — ინარჩუნებს სიმინდის საკუთარ გემოს. ასევე გამოდგება პოლენტისა და პურისთვის.',
    price: '4.00', in_stock: true, sku: 'CHV-CORN-1KG', image_url: IMG.corn,
  },
  {
    external_id: 'chventan_tea_first_40g',
    category_key: 'chay', category: 'Чай', category_en: 'Tea', category_ka: 'ჩაი',
    sub_category: 'Чёрный чай', sub_category_en: 'Black tea', sub_category_ka: 'შავი ჩაი',
    name_ru: 'Чай высшего сорта CH’VENTAN, 40 г',
    name_en: 'Premium Tea CH’VENTAN, 40 g',
    name_ka: 'უმაღლესი ხარისხის ჩაი CH’VENTAN, 40 გ',
    description_ru:
      'Грузинский чёрный чай высшего сорта ручного сбора, 40 г.\n\n' +
      'Лист собирают в мае методом отбора — по три верхних листа с почкой. Это самая трудоёмкая часть: машина так не умеет, только руки.\n\n' +
      'Дальше классический полный цикл. Завяливание — лист теряет часть влаги и становится эластичным. Скручивание в машине — разрушаются клеточные стенки, начинают выделяться соки. Ферментация, она же окисление, несколько часов в прохладном помещении — именно здесь зелёный лист превращается в чёрный чай и набирает вкус. Финальная сушка в печи останавливает процесс.\n\n' +
      'Высший сорт означает, что в упаковку идёт только отборный лист с верхушек побега. Информация о регионе, производителе, способе заваривания и хранении указана на упаковке 40 г.',
    description_en:
      'Georgian premium black tea, hand-picked, 40 g. The leaf is selected in May — three top leaves with the bud, work no machine can do. Then the full classic cycle: withering, rolling, several hours of oxidation in a cool room where green leaf becomes black tea, and a final kiln drying that stops the process. Premium grade means only selected top-shoot leaf goes into the pack.',
    description_ka:
      'ქართული შავი ჩაი, უმაღლესი ხარისხი, ხელით კრეფილი, 40 გ. ფოთოლს კრეფენ მაისში — სამი ზედა ფოთოლი კვირტთან ერთად. შემდეგ ჭკნობა, დახვევა, ფერმენტაცია რამდენიმე საათი გრილ ადგილას და საბოლოო შრობა ღუმელში.',
    price: '2.40', in_stock: true, sku: 'CHV-TEA-1ST', image_url: IMG.tea,
  },
  {
    external_id: 'chventan_tea_second_40g',
    category_key: 'chay', category: 'Чай', category_en: 'Tea', category_ka: 'ჩაი',
    sub_category: 'Чёрный чай', sub_category_en: 'Black tea', sub_category_ka: 'შავი ჩაი',
    name_ru: 'Чай второго сорта CH’VENTAN, 40 г',
    name_en: 'Second Grade Tea CH’VENTAN, 40 g',
    name_ka: 'მეორე ხარისხის ჩაი CH’VENTAN, 40 გ',
    description_ru:
      'Грузинский чёрный чай второго сорта, 40 г — тот же лист и та же технология, что и у высшего сорта, но в упаковку идёт более крупная и зрелая часть сбора.\n\n' +
      'Технология не меняется: майский сбор, завяливание, скручивание в машине, ферментация в прохладном месте, сушка в печи. Отличие в сортировке листа, а не в качестве обработки.\n\n' +
      'На практике второй сорт заваривается крепче и быстрее, даёт более плотный, терпкий настой. Это чай для утренней кружки и для тех, кто пьёт с молоком или лимоном — деликатность высшего сорта там всё равно потерялась бы.\n\n' +
      'Способ заваривания, срок хранения и данные производителя — на упаковке.',
    description_en:
      'Georgian second-grade black tea, 40 g — the same leaf and the same processing as the premium grade, but a larger, more mature part of the harvest goes into the pack. In practice it brews stronger and faster and gives a denser, more astringent cup: a morning tea, and the right choice if you drink it with milk or lemon.',
    description_ka:
      'ქართული შავი ჩაი, მეორე ხარისხი, 40 გ — იგივე ფოთოლი და ტექნოლოგია, ოღონდ უფრო მსხვილი ნაწილი. უფრო სწრაფად და მაგრად იხარშება, იძლევა მკვრივ, მწკლარტე ნაყენს.',
    price: '1.20', in_stock: true, sku: 'CHV-TEA-2ND', image_url: IMG.tea,
  },
  {
    external_id: 'chventan_wine_ambre',
    category_key: 'vino', category: 'Вино', category_en: 'Wine', category_ka: 'ღვინო',
    sub_category: 'Квеври', sub_category_en: 'Qvevri', sub_category_ka: 'ქვევრი',
    name_ru: 'Вино янтарное квеври AMBRE, CH’VENTAN',
    name_en: 'Amber Qvevri Wine AMBRE, CH’VENTAN',
    name_ka: 'ქარვისფერი ქვევრის ღვინო AMBRE, CH’VENTAN',
    description_ru:
      'Янтарное квеври-вино AMBRE из сортов Киси и Мцване, собственный виноград хозяйства CH’VENTAN в Кахетии.\n\n' +
      'Вино делается традиционным грузинским способом — в квеври, глиняном сосуде, закопанном в землю. Сок бродит вместе с кожицей и гребнями, отсюда янтарный цвет, танинная структура и плотность, нехарактерные для обычных белых вин.\n\n' +
      'Хозяйство сознательно не выравнивает вино из года в год: каждый урожай остаётся отдельной историей со своим характером, и в этом смысл небольшого производства.\n\n' +
      'Партия ограниченная. Цена будет объявлена после подготовки первого выпуска — оставьте заявку, сообщим о поступлении.',
    description_en:
      'AMBRE amber qvevri wine from Kisi and Mtsvane grapes grown on the CH’VENTAN estate in Kakheti. Made the traditional Georgian way in a clay qvevri buried in the ground, fermenting on skins and stems — hence the amber colour, the tannic structure and a density unusual for white wine. Each vintage is deliberately left as its own story. Limited release; price to be announced.',
    description_ka:
      'ქარვისფერი ქვევრის ღვინო AMBRE — ქისი და მწვანე, CH’VENTAN-ის საკუთარი ვენახიდან კახეთში. მზადდება ტრადიციულად, მიწაში ჩაფლულ ქვევრში, კანთან და ჭაჭასთან ერთად დუღილით. შეზღუდული პარტია; ფასი გამოცხადდება მოგვიანებით.',
    price: null, in_stock: false, sku: 'CHV-WINE-AMBRE', image_url: IMG.wine,
  },
  {
    external_id: 'chventan_wine_red_2025',
    category_key: 'vino', category: 'Вино', category_en: 'Wine', category_ka: 'ღვინო',
    sub_category: 'Красное сухое', sub_category_en: 'Red dry', sub_category_ka: 'წითელი მშრალი',
    name_ru: 'Вино красное сухое CH’VENTAN, урожай 2025',
    name_en: 'Red Dry Wine CH’VENTAN, 2025 vintage',
    name_ka: 'წითელი მშრალი ღვინო CH’VENTAN, 2025 მოსავალი',
    description_ru:
      'Красное сухое вино CH’VENTAN урожая 2025 года — второе направление винного производства хозяйства.\n\n' +
      'Виноград выращивается в Кахетии, на собственных участках. Подход тот же, что и с янтарным AMBRE: минимум вмешательства, ставка на конкретный урожай и терруар, а не на воспроизведение одного и того же вкуса каждый год.\n\n' +
      'Вино выпускается ограниченными партиями. Для хозяйства качество и индивидуальность урожая важнее объёма — в этом принципиальная разница между фермерским вином и заводским.\n\n' +
      'Цена будет объявлена после подготовки первой партии к выпуску.',
    description_en:
      'CH’VENTAN red dry wine, 2025 vintage — the estate’s second wine project. Grapes grown on its own plots in Kakheti, with the same approach as the amber AMBRE: minimal intervention, betting on the particular harvest and terroir rather than reproducing one taste year after year. Released in limited batches; price to be announced.',
    description_ka:
      'წითელი მშრალი ღვინო CH’VENTAN, 2025 წლის მოსავალი. ყურძენი მოყვანილია კახეთში, საკუთარ ნაკვეთებზე. მინიმალური ჩარევა, აქცენტი კონკრეტულ მოსავალსა და ტერუარზე. შეზღუდული პარტიები; ფასი გამოცხადდება მოგვიანებით.',
    price: null, in_stock: false, sku: 'CHV-WINE-RED', image_url: IMG.wine,
  },
];

async function main() {
  console.log(`⏳ Заливаем ${products.length} товаров бренда ${FARMER}…`);

  // ── 0. Схема. Раньше это был отдельный SQL-файл; теперь скрипт
  //       доводит базу до нужного состояния сам и делает это идемпотентно.
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS farmer_slug text`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS farmer_name text`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_farmer ON products (farmer_slug)`;
  console.log('  ✓ колонки farmer_slug / farmer_name на месте');

  // ── 1. Категории. Товар без строки в categories не появится ни в карусели,
  //       ни в фильтрах, ни в sitemap — он станет сиротой.
  for (const c of CATEGORIES) {
    await sql`
      INSERT INTO categories (category_key, name, name_en, name_ka)
      VALUES (${c.key}, ${c.ru}, ${c.en}, ${c.ka})
      ON CONFLICT (category_key) DO UPDATE
        SET name = EXCLUDED.name, name_en = EXCLUDED.name_en, name_ka = EXCLUDED.name_ka
    `;
  }
  console.log(`  ✓ категорий проверено: ${CATEGORIES.length}`);

  // ── 2. Товары. Один UPSERT вместо связки SELECT + IF + INSERT/UPDATE:
  //       меньше кода, нет гонки, и колонки перечислены ровно один раз.
  let n = 0;
  for (const p of products) {
    await sql`
      INSERT INTO products (
        external_id, source, farmer_slug, farmer_name,
        name, name_ru, name_en, name_ka,
        description, description_ru, description_en, description_ka,
        price, currency, in_stock, availability,
        category, category_en, category_ka, category_key,
        sub_category, sub_category_en, sub_category_ka,
        image_url, images, sku, updated_at
      ) VALUES (
        ${p.external_id}, 'gorgia', ${FARMER_SLUG}, ${FARMER},
        ${p.name_ru}, ${p.name_ru}, ${p.name_en}, ${p.name_ka},
        ${p.description_ru}, ${p.description_ru}, ${p.description_en}, ${p.description_ka},
        ${p.price}, 'GEL', ${p.in_stock},
        ${p.in_stock ? 'В наличии' : 'Скоро в продаже'},
        ${p.category}, ${p.category_en}, ${p.category_ka}, ${p.category_key},
        ${p.sub_category ?? null}, ${p.sub_category_en ?? null}, ${p.sub_category_ka ?? null},
        ${p.image_url}, ${sql.json([p.image_url])}, ${p.sku}, NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        farmer_slug     = EXCLUDED.farmer_slug,
        farmer_name     = EXCLUDED.farmer_name,
        name            = EXCLUDED.name,
        name_ru         = EXCLUDED.name_ru,
        name_en         = EXCLUDED.name_en,
        name_ka         = EXCLUDED.name_ka,
        description     = EXCLUDED.description,
        description_ru  = EXCLUDED.description_ru,
        description_en  = EXCLUDED.description_en,
        description_ka  = EXCLUDED.description_ka,
        price           = EXCLUDED.price,
        currency        = EXCLUDED.currency,
        in_stock        = EXCLUDED.in_stock,
        availability    = EXCLUDED.availability,
        category        = EXCLUDED.category,
        category_en     = EXCLUDED.category_en,
        category_ka     = EXCLUDED.category_ka,
        category_key    = EXCLUDED.category_key,
        sub_category    = EXCLUDED.sub_category,
        sub_category_en = EXCLUDED.sub_category_en,
        sub_category_ka = EXCLUDED.sub_category_ka,
        image_url       = EXCLUDED.image_url,
        images          = EXCLUDED.images,
        sku             = EXCLUDED.sku,
        updated_at      = NOW()
    `;
    n++;
    console.log(`  ✓ ${p.name_ru}`);
  }

  // ── 3. Подкатегории.
  await sql`
    INSERT INTO subcategories (category_key, key, name, name_en, name_ka)
    SELECT DISTINCT ON (lower(replace(sub_category, ' ', '-')))
           category_key, lower(replace(sub_category, ' ', '-')),
           sub_category, sub_category_en, sub_category_ka
    FROM products
    WHERE farmer_slug = ${FARMER_SLUG} AND sub_category IS NOT NULL
    ON CONFLICT (key) DO NOTHING
  `;

  // ── 4. Картинки категориям, чтобы карусель не показывала заглушки.
  await sql`
    UPDATE categories c
    SET category_image = COALESCE(c.category_image, (
      SELECT p.image_url FROM products p
      WHERE p.category_key = c.category_key AND p.image_url IS NOT NULL
      ORDER BY p.id LIMIT 1
    ))
    WHERE c.category_key IN ${sql(CATEGORIES.map(c => c.key))}
  `;

  // ── 5. Заглушки вместо пустых фото.
  //       image_url IS NULL выкидывает товар из sitemap и из счётчиков
  //       категорий (/api/products/categories), а в вёрстке оставляет дыру.
  await sql`
    UPDATE products SET image_url = '/placeholder-product.svg', updated_at = NOW()
    WHERE image_url IS NULL OR image_url = ''
  `;
  await sql`
    UPDATE categories SET category_image = '/placeholder-category.svg'
    WHERE category_image IS NULL
  `;

  // ── 6. Нулевые цены -> «скоро в продаже».
  //       price = 0 при in_stock = true даёт на витрине «0 ₾» с рабочей
  //       кнопкой покупки, а в schema.org Product — ошибку Merchant Center.
  await sql`
    UPDATE products
    SET price = NULL, in_stock = false, availability = 'Скоро в продаже', updated_at = NOW()
    WHERE price = 0
  `;

  const check = await sql`
    SELECT category_key, COUNT(*)::int AS n
    FROM products WHERE farmer_slug = ${FARMER_SLUG}
    GROUP BY category_key ORDER BY category_key
  `;
  console.log(`\n🎉 Готово, в базе ${n} товаров:`);
  for (const r of check) console.log(`   ${r.category_key}: ${r.n}`);
}

main()
  .catch((e) => { console.error('❌ Ошибка:', e); process.exitCode = 1; })
  .finally(() => sql.end());