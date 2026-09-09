import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!dbUrl) {
  console.error('❌ Ошибка: DATABASE_URL или DIRECT_URL не найдены в .env');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function main() {
  console.log('🔄 Переносим товары в правильные категории...');

  try {
    // 1. Переносим чай в категорию "Чай" (ключ 'chay')
    await sql`
      UPDATE products 
      SET category = 'Чай', category_key = 'chay'
      WHERE external_id IN ('tea_first_grade_40g', 'tea_second_grade_40g');
    `;
    console.log('✅ Чай успешно перенесен в категорию "Чай"!');

    // 2. Переносим ткемали и муку в категорию "Специи" (ключ 'spetsii')
    await sql`
      UPDATE products 
      SET category = 'Специи', category_key = 'spetsii'
      WHERE external_id IN ('corn_flour_farm', 'chventan_tkemali_500', 'chventan_tkemali_310');
    `;
    console.log('✅ Ткемали и мука успешно перенесены в категорию "Специи"!');

    // (Вино 'chventan_wine_ambre' и 'chventan_wine_red_2025' останется в 'Гостинцы из Грузии' ('gostintsy-iz-gruzii'), так как отдельной категории для вина пока нет)

  } catch (error) {
    console.error('❌ Ошибка при переносе:', error);
  } finally {
    process.exit(0);
  }
}

main();