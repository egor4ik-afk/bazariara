const { Client } = require('pg');
// # Вставь свои ссылки (обязательно оставь в кавычках)
// # запуск снизу node migrate.js
OLD_URL = ""
NEW_URL = ""

async function migrate() {
  console.log("🔌 Подключаемся к базам...");
  const oldClient = new Client({ connectionString: OLD_URL });
  const newClient = new Client({ connectionString: NEW_URL });

  try {
    await oldClient.connect();
    await newClient.connect();

    // --- ПЕРЕНОС ТОВАРОВ ---
    console.log("📦 Скачиваем товары из старой БД...");
    const productsRes = await oldClient.query('SELECT * FROM products');
    const products = productsRes.rows;

    if (products.length > 0) {
      console.log(`🚀 Заливаем ${products.length} товаров в новую БД (это может занять пару минут)...`);
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const ObjectKeys = Object.keys(p);
        const ObjectValues = Object.values(p);
        const placeholders = ObjectKeys.map((_, idx) => `$${idx + 1}`).join(', ');

        const query = `
          INSERT INTO products (${ObjectKeys.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;
        await newClient.query(query, ObjectValues);

        if ((i + 1) % 100 === 0) {
          console.log(`   ⏳ Перенесено ${i + 1} / ${products.length} товаров...`);
        }
      }
      console.log("✅ Товары успешно перенесены!");
    }

    // --- ПЕРЕНОС ИСТОРИИ ЦЕН ---
    console.log("💰 Скачиваем историю цен...");
    const historyRes = await oldClient.query('SELECT * FROM price_history');
    const history = historyRes.rows;

    if (history.length > 0) {
      console.log(`🚀 Заливаем ${history.length} записей истории цен...`);
      for (let i = 0; i < history.length; i++) {
        const h = history[i];
        const ObjectKeys = Object.keys(h);
        const ObjectValues = Object.values(h);
        const placeholders = ObjectKeys.map((_, idx) => `$${idx + 1}`).join(', ');

        const query = `
          INSERT INTO price_history (${ObjectKeys.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;
        await newClient.query(query, ObjectValues);
      }
      console.log("✅ История цен перенесена!");
    }

    // --- ЧИНИМ СЧЕТЧИКИ (SEQUENCES) ---
    console.log("🔧 Восстанавливаем счетчики автоинкремента...");
    await newClient.query("SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) + 1 FROM products), 1), false);");
    
    try {
      await newClient.query("SELECT setval('price_history_id_seq', COALESCE((SELECT MAX(id) + 1 FROM price_history), 1), false);");
    } catch (e) {
      // Игнорируем, если такой таблицы или счетчика нет
    }
    
    console.log("🎉 База полностью готова к работе! Счетчики восстановлены.");

  } catch (error) {
    console.error("❌ Ошибка при миграции:", error);
  } finally {
    await oldClient.end();
    await newClient.end();
    console.log("🏁 Скрипт завершил работу.");
  }
}

migrate();