// Картинки с нашего CDN — через оптимизатор Next (/_next/image): ресайз и webp.
// Оригиналы весят 100–450 КБ, после оптимизатора — десятки.
//
// Ширины обязаны быть из next.config.js (deviceSizes + imageSizes):
// 128, 256, 384, 640, 1080, 1920. Любую другую оптимизатор отклонит с 400.

// i.ibb.co — фото новогодних товаров из прошлогодней выгрузки.
const OPTIMIZE_HOSTS = /^https:\/\/(cdn\.relaxdev\.ru|storage\.yandexcloud\.net|i\.ibb\.co)\//;

export type ImgWidth = 128 | 256 | 384 | 640 | 1080 | 1920;

export function canOptimize(url: string | null | undefined): url is string {
  return !!url && OPTIMIZE_HOSTS.test(url);
}

/** Адрес картинки нужной ширины. Чужие хосты и пустые значения — как есть. */
export function optimizedSrc(url: string, w: ImgWidth): string {
  return canOptimize(url) ? `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75` : url;
}

/** srcSet из нескольких ширин: браузер сам выберет под экран и плотность пикселей. */
export function optimizedSrcSet(url: string, widths: ImgWidth[]): string | undefined {
  if (!canOptimize(url)) return undefined;
  return widths.map((w) => `${optimizedSrc(url, w)} ${w}w`).join(', ');
}
