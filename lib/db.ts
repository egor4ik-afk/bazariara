import postgres from 'postgres';

// Для отключения SSL устанавливаем значение false
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: false, 
  max: 10,
  idle_timeout: 20,
  // Если сервер БД медленно отвечает на установку соединения, 
  // можно добавить connect_timeout: 10
});

export default sql;