// FILE: lib/env.ts
//
// Платформа при сборке подставляет вместо незаданных переменных окружения
// заглушки — «auto-generated-stub-for-build» и «https://build-stub-domain.com»,
// — и они доживают до работы сервера. Для кода это не «пусто», а значение:
// `process.env.X || 'по умолчанию'` берёт заглушку, и всё ломается
// неочевидно (так Telegram получил адрес «auto-generated-stub-for-build/bot…»
// и падал с Invalid URL, а пиксель Meta — ID «auto-generated-stub-for-build»).

export const BUILD_STUB = /build-stub-domain\.com|auto-generated-stub-for-build/i;

/** Значение переменной на сервере во время работы; заглушка считается пустотой. */
export function runtimeEnv(name: string): string {
  // Имя переменной приходит параметром: Next не может подставить значение
  // на этапе сборки, как делает с переменными NEXT_PUBLIC_*.
  const v = (process.env[name] ?? '').trim();
  return BUILD_STUB.test(v) ? '' : v;
}

/** Убирает заглушки из process.env. Возвращает имена убранных переменных. */
export function scrubBuildStubs(): string[] {
  const removed: string[] = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (value && BUILD_STUB.test(value)) {
      delete process.env[key];
      removed.push(key);
    }
  }
  return removed.sort();
}
