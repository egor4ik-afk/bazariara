// FILE: instrumentation.ts
//
// Next вызывает register() один раз при старте сервера, до первого запроса.
// Здесь вычищаем из окружения заглушки, которые платформа подставляет при
// сборке вместо незаданных переменных (см. lib/env.ts). После этого
// `process.env.X || 'по умолчанию'` во всём коде снова работает как задумано.
// Имена найденных заглушек пишутся в лог — значения не пишутся никогда.

export async function register() {
  const { scrubBuildStubs } = await import('./lib/env');
  const removed = scrubBuildStubs();
  if (removed.length) {
    console.warn(`[env] вместо значений стоят заглушки сборки, считаю незаданными: ${removed.join(', ')}`);
  }
}
