import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!dbUrl) {
  console.error('❌ Ошибка: DATABASE_URL не найден в .env');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function main() {
  try {
    console.log('⏳ Заливаем товары фермера с правильной структурой базы...');

    const products = [
      // Ткемали 500мл (Специи / spetsii)
      {
        external_id: 'chventan_tkemali_500',
        name: 'Ткемали CH’VENTAN 500мл',
        name_ru: 'Ткемали CH’VENTAN 500мл',
        name_en: 'Tkemali CH’VENTAN 500ml',
        name_ka: 'ტყემალი CH’VENTAN 500ml',
        description: 'Натуральный грузинский соус ткемали.',
        description_ru: 'Натуральный грузинский соус ткемали. Создается на основе настоящей грузинской сливы с традиционными травами и специями.',
        description_en: 'Natural Georgian tkemali sauce.',
        description_ka: 'ნატურალური ქართული ტყემლის სოუსი.',
        price: '15.00',
        currency: 'GEL',
        in_stock: true,
        category: 'Специи',
        category_en: 'Spices',
        category_ka: 'სანელებლები',
        category_key: 'spetsii',
        image_url: 'https://cdn.relaxdev.ru/bazariara/admin/1786624145879_photo_5472130159126190823_w.jpg',
        images: '["https://cdn.relaxdev.ru/bazariara/admin/1786624145879_photo_5472130159126190823_w.jpg"]',
        sku: 'CHV-TKM-500'
      },
      // Ткемали 310мл (Специи / spetsii)
      {
        external_id: 'chventan_tkemali_310',
        name: 'Ткемали CH’VENTAN 310мл',
        name_ru: 'Ткемали CH’VENTAN 310мл',
        name_en: 'Tkemali CH’VENTAN 310ml',
        name_ka: 'ტყემალი CH’VENTAN 310ml',
        description: 'Натуральный грузинский соус ткемали.',
        description_ru: 'Натуральный грузинский соус ткемали.',
        description_en: 'Natural Georgian tkemali sauce.',
        description_ka: 'ნატურალური ქართული ტყემლის სოუსი.',
        price: '10.00',
        currency: 'GEL',
        in_stock: true,
        category: 'Специи',
        category_en: 'Spices',
        category_ka: 'სანელებლები',
        category_key: 'spetsii',
        image_url: 'https://cdn.relaxdev.ru/bazariara/admin/1786624145879_photo_5472130159126190823_w.jpg',
        images: '["https://cdn.relaxdev.ru/bazariara/admin/1786624145879_photo_5472130159126190823_w.jpg"]',
        sku: 'CHV-TKM-310'
      },
      // Кукурузная мука (Специи / spetsii)
      {
        external_id: 'corn_flour_farm',
        name: 'Натуральная кукурузная мука (1 кг)',
        name_ru: 'Натуральная кукурузная мука (1 кг)',
        name_en: 'Natural Corn Flour (1 kg)',
        name_ka: 'ნატურალური სიმინდის ფქვილი (1 კგ)',
        description: 'Натуральная кукурузная мука.',
        description_ru: 'Натуральная кукурузная мука местного производства. Идеально подходит для мчади и гоми.',
        description_en: 'Natural local corn flour.',
        description_ka: 'ნატურალური სიმინდის ფქვილი.',
        price: '4.00',
        currency: 'GEL',
        in_stock: true,
        category: 'Специи',
        category_en: 'Spices',
        category_ka: 'სანელებლები',
        category_key: 'spetsii',
        image_url: 'https://cdn.relaxdev.ru/bazariara/admin/1786643514347_IMG_2694.jpg',
        images: '["https://cdn.relaxdev.ru/bazariara/admin/1786643514347_IMG_2694.jpg"]',
        sku: 'CHV-CORN-1KG'
      },
      // Чай высшего сорта (Чай / chay)
      {
        external_id: 'tea_first_grade_40g',
        name: 'Чай высшего сорта CH’VENTAN (40 г)',
        name_ru: 'Чай высшего сорта CH’VENTAN (40 г)',
        name_en: 'Premium Tea CH’VENTAN (40 g)',
        name_ka: 'უმაღლესი ხარისხის ჩაი CH’VENTAN (40 გ)',
        description: 'Чай высшего сорта.',
        description_ru: 'Сырой чай собирают в мае методом отбора — по три листа (почки). Затем следует завяливание, скручивание, ферментация и сушка.',
        description_en: 'Premium tea, hand-picked in May. 40g package.',
        description_ka: 'უმაღლესი ხარისხის ჩაი.',
        price: '2.40',
        currency: 'GEL',
        in_stock: true,
        category: 'Чай',
        category_en: 'Tea',
        category_ka: 'ჩაი',
        category_key: 'chay',
        image_url: 'https://cdn.relaxdev.ru/bazariara/admin/1786629867533_IMG_2688.jpg',
        images: '["https://cdn.relaxdev.ru/bazariara/admin/1786629867533_IMG_2688.jpg"]',
        sku: 'CHV-TEA-1ST'
      },
      // Чай второго сорта (Чай / chay)
      {
        external_id: 'tea_second_grade_40g',
        name: 'Чай второго сорта CH’VENTAN (40 г)',
        name_ru: 'Чай второго сорта CH’VENTAN (40 г)',
        name_en: 'Second Grade Tea CH’VENTAN (40 g)',
        name_ka: 'მეორე ხარისხის ჩაი CH’VENTAN (40 გ)',
        description: 'Чай второго сорта.',
        description_ru: 'Чай второго сорта. Сырой чай собирают в мае, завяливают, скручивают, ферментируют и сушат.',
        description_en: 'Second grade tea. 40g package.',
        description_ka: 'მეორე ხარისხის ჩაი.',
        price: '1.20',
        currency: 'GEL',
        in_stock: true,
        category: 'Чай',
        category_en: 'Tea',
        category_ka: 'ჩაი',
        category_key: 'chay',
        image_url: 'https://cdn.relaxdev.ru/bazariara/admin/1786629867533_IMG_2688.jpg',
        images: '["https://cdn.relaxdev.ru/bazariara/admin/1786629867533_IMG_2688.jpg"]',
        sku: 'CHV-TEA-2ND'
      },
      // Вино янтарное AMBRE (Гостинцы из Грузии / gostintsy-iz-gruzii)
      {
        external_id: 'chventan_wine_ambre',
        name: 'Вино янтарное квеври AMBRE (CH’VENTAN)',
        name_ru: 'Вино янтарное квеври AMBRE (CH’VENTAN)',
        name_en: 'Amber Qvevri Wine AMBRE (CH’VENTAN)',
        name_ka: 'ქარვისფერი ქვევრის ღვინო AMBRE (CH’VENTAN)',
        description: 'Вино янтарное квеври.',
        description_ru: 'Небольшое производство грузинского вина из собственного винограда. Готовится наше янтарное квеври-вино AMBRE — из сортов Киси и Мцване.',
        description_en: 'Amber qvevri wine from Kisi and Mtsvane.',
        description_ka: 'ქარვისფერი ქვევრის ღვინო.',
        price: '0.00',
        currency: 'GEL',
        in_stock: true,
        category: 'Гостинцы из Грузии',
        category_en: 'Gifts from Georgia',
        category_ka: 'საჩუქრები საქართველოდან',
        category_key: 'gostintsy-iz-gruzii',
        image_url: 'https://cdn.relaxdev.ru/bazariara/admin/1786643785003_IMG_2714.jpg',
        images: '["https://cdn.relaxdev.ru/bazariara/admin/1786643785003_IMG_2714.jpg"]',
        sku: 'CHV-WINE-AMBRE'
      },
      // Вино красное сухое (Гостинцы из Грузии / gostintsy-iz-gruzii)
      {
        external_id: 'chventan_wine_red_2025',
        name: 'Вино красное сухое CH’VENTAN 2025',
        name_ru: 'Вино красное сухое CH’VENTAN 2025',
        name_en: 'Red Dry Wine CH’VENTAN 2025',
        name_ka: 'წითელი მშრალი ღვინო CH’VENTAN 2025',
        description: 'Вино красное сухое.',
        description_ru: 'Направление красного сухого вина CH’VENTAN урожая 2025 года. Вино будет выпускаться ограниченными партиями.',
        description_en: 'Red dry wine CH’VENTAN 2025.',
        description_ka: 'წითელი მშრალი ღვინო CH’VENTAN 2025.',
        price: '0.00',
        currency: 'GEL',
        in_stock: true,
        category: 'Гостинцы из Грузии',
        category_en: 'Gifts from Georgia',
        category_ka: 'საჩუქრები საქართველოდან',
        category_key: 'gostintsy-iz-gruzii',
        image_url: 'https://cdn.relaxdev.ru/bazariara/admin/1786643785003_IMG_2714.jpg',
        images: '["https://cdn.relaxdev.ru/bazariara/admin/1786643785003_IMG_2714.jpg"]',
        sku: 'CHV-WINE-RED'
      }
    ];

    for (const p of products) {
      const existing = await sql`SELECT id FROM products WHERE external_id = ${p.external_id}`;

      if (existing.length > 0) {
        // Обновляем существующий товар, приводя к полной структуре
        await sql`
          UPDATE products SET 
            name = ${p.name}, name_ru = ${p.name_ru}, name_en = ${p.name_en}, name_ka = ${p.name_ka},
            description = ${p.description}, description_ru = ${p.description_ru}, description_en = ${p.description_en}, description_ka = ${p.description_ka},
            price = ${p.price}, currency = ${p.currency}, in_stock = ${p.in_stock},
            category = ${p.category}, category_en = ${p.category_en}, category_ka = ${p.category_ka}, category_key = ${p.category_key},
            image_url = ${p.image_url}, images = ${p.images}, sku = ${p.sku}
          WHERE external_id = ${p.external_id}
        `;
        console.log(`🔄 Обновлен и заполнен: ${p.name_ru}`);
      } else {
        // Вставляем новый с полной структурой
        await sql`
          INSERT INTO products (
            external_id, name, name_ru, name_en, name_ka, 
            description, description_ru, description_en, description_ka, 
            price, currency, in_stock, category, category_en, category_ka, category_key, 
            image_url, images, sku
          ) VALUES (
            ${p.external_id}, ${p.name}, ${p.name_ru}, ${p.name_en}, ${p.name_ka},
            ${p.description}, ${p.description_ru}, ${p.description_en}, ${p.description_ka},
            ${p.price}, ${p.currency}, ${p.in_stock}, ${p.category, p.category_en, p.category_ka, p.category_key},
            ${p.image_url}, ${p.images}, ${p.sku}
          )
        `;
        console.log(`✅ Добавлен с полной структурой: ${p.name_ru}`);
      }
    }

    console.log('🎉 Всё! Теперь у всех товаров прописаны категории, переводы и картинки.');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit(0);
  }
}

main();