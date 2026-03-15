import postgres from 'postgres';

// postgres() поддерживает параметризованные запросы: sql('SELECT ... WHERE id = $1', [id])
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
});

export default sql;
