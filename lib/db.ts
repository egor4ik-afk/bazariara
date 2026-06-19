import postgres from 'postgres';

// Функция, которая гарантированно вернет валидный URL для сборки
function getSafeUrl() {
  const url = process.env.DATABASE_URL;
  // Если ссылки нет, или она кривая (не начинается с postgres), отдаем фейк
  if (!url || typeof url !== 'string' || !url.startsWith('postgres')) {
    return 'postgres://dummy:dummy@localhost:5432/dummy';
  }
  return url;
}

const sql = postgres(getSafeUrl(), {
  ssl: 'require', 
  max: 10,
  idle_timeout: 20,
});

export default sql;