import 'dotenv/config'; // Принудительно читаем .env в первую очередь
import postgres from 'postgres';

// Берем URL напрямую из .env
const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!dbUrl) {
  console.error('❌ Ошибка: DATABASE_URL или DIRECT_URL не найдены в .env');
  process.exit(1);
}

// Создаем подключение специально для скрипта
const sql = postgres(dbUrl);

async function main() {
  console.log('⏳ Подключаемся к базе и начинаем добавление товаров...');

  const products = [
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
      price: 15,
      currency: 'GEL',
      in_stock: true,
      category_key: 'gostintsy-iz-gruzii',
      category: 'Гостинцы из Грузии'
    },
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
      price: 10,
      currency: 'GEL',
      in_stock: true,
      category_key: 'gostintsy-iz-gruzii',
      category: 'Гостинцы из Грузии'
    },
    {
      external_id: 'chventan_wine_ambre',
      name: 'Вино янтарное квеври AMBRE',
      name_ru: 'Вино янтарное квеври AMBRE (CH’VENTAN)',
      name_en: 'Amber Qvevri Wine AMBRE (CH’VENTAN)',
      name_ka: 'ქარვისფერი ქვევრის ღვინო AMBRE (CH’VENTAN)',
      description: 'Вино янтарное квеври.',
      description_ru: 'Небольшое производство грузинского вина из собственного винограда. Готовится наше янтарное квеври-вино AMBRE — из сортов Киси и Мцване.',
      description_en: 'Amber qvevri wine from Kisi and Mtsvane.',
      description_ka: 'ქარვისფერი ქვევრის ღვინო.',
      price: 0,
      currency: 'GEL',
      in_stock: true,
      category_key: 'gostintsy-iz-gruzii',
      category: 'Гостинцы из Грузии'
    },
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
      price: 0,
      currency: 'GEL',
      in_stock: true,
      category_key: 'gostintsy-iz-gruzii',
      category: 'Гостинцы из Грузии'
    },
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
      price: 4,
      currency: 'GEL',
      in_stock: true,
      category_key: 'gostintsy-iz-gruzii',
      category: 'Гостинцы из Грузии'
    },
    {
      external_id: 'tea_first_grade_40g',
      name: 'Чай высшего сорта (40 г)',
      name_ru: 'Чай высшего сорта (40 г)',
      name_en: 'Premium Tea (40 g)',
      name_ka: 'უმაღლესი ხარისხის ჩაი (40 გ)',
      description: 'Чай высшего сорта.',
      description_ru: 'Сырой чай собирают в мае методом отбора — по три листа (почки). Затем следует завяливание, скручивание, ферментация (окисление) и сушка.',
      description_en: 'Premium tea, hand-picked in May. 40g package.',
      description_ka: 'უმაღლესი ხარისხის ჩაი.',
      price: 2.4,
      currency: 'GEL',
      in_stock: true,
      category_key: 'gostintsy-iz-gruzii',
      category: 'Гостинцы из Грузии'
    },
    {
      external_id: 'tea_second_grade_40g',
      name: 'Чай второго сорта (40 г)',
      name_ru: 'Чай второго сорта (40 г)',
      name_en: 'Second Grade Tea (40 g)',
      name_ka: 'მეორე ხარისხის ჩაი (40 გ)',
      description: 'Чай второго сорта.',
      description_ru: 'Чай второго сорта. Сырой чай собирают в мае, завяливают, скручивают, ферментируют и сушат.',
      description_en: 'Second grade tea. 40g package.',
      description_ka: 'მეორე ხარისხის ჩაი.',
      price: 1.2,
      currency: 'GEL',
      in_stock: true,
      category_key: 'gostintsy-iz-gruzii',
      category: 'Гостинцы из Грузии'
    }
  ];

  try {
    for (const p of products) {
      const existing = await sql`SELECT id FROM products WHERE external_id = ${p.external_id}`;
      
      if (existing.length === 0) {
        await sql`
          INSERT INTO products (
            external_id, name, name_ru, name_en, name_ka, 
            description, description_ru, description_en, description_ka, 
            price, currency, in_stock, category_key, category
          ) VALUES (
            ${p.external_id}, ${p.name}, ${p.name_ru}, ${p.name_en}, ${p.name_ka},
            ${p.description}, ${p.description_ru}, ${p.description_en}, ${p.description_ka},
            ${p.price}, ${p.currency}, ${p.in_stock}, ${p.category_key}, ${p.category}
          )
        `;
        console.log(`✅ Добавлен: ${p.name_ru}`);
      } else {
        console.log(`⏭ Пропущен (уже есть): ${p.name_ru}`);
      }
    }
    console.log('🎉 Все товары фермеров успешно добавлены!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при добавлении:', error);
    process.exit(1);
  }
}

main();