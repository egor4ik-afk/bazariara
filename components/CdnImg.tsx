'use client';

// <img> для картинок с нашего CDN: идёт через оптимизатор Next (ресайз + webp),
// грузится лениво и не мешает отрисовке страницы. Если оптимизатор не ответил
// (sharp не поднялся, сервер перегружен), подставляется исходный файл, так что
// картинка не пропадёт. В серверном компоненте onError не повесить — поэтому
// отдельный клиентский компонент.

import { optimizedSrc, optimizedSrcSet, type ImgWidth } from '@/lib/img';

export default function CdnImg({
  src,
  alt,
  width,
  srcSetWidths,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  /** Ширина для src: ею пользуются браузеры без srcset и боты. */
  width: ImgWidth;
  srcSetWidths?: ImgWidth[];
  sizes?: string;
  className?: string;
}) {
  return (
    <img
      src={optimizedSrc(src, width)}
      srcSet={srcSetWidths ? optimizedSrcSet(src, srcSetWidths) : undefined}
      sizes={srcSetWidths ? sizes : undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className={className}
      onError={(e) => {
        const el = e.currentTarget;
        if (el.dataset.fallback) return;
        el.dataset.fallback = '1';
        el.removeAttribute('srcset');
        el.src = src;
      }}
    />
  );
}
