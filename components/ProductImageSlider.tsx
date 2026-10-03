'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { isVideoUrl } from '@/lib/media';

// Картинки с CDN — через оптимизатор Next (/_next/image): ресайз под карточку
// (640 px — с запасом на ретину) и webp. Оригиналы весят 100–450 КБ, после — десятки.
// Если оптимизатор не ответит, onError вернёт исходный файл.
const OPTIMIZE_HOSTS = /^https:\/\/(cdn\.relaxdev\.ru|storage\.yandexcloud\.net)\//;
function cardSrc(url: string): string {
  return OPTIMIZE_HOSTS.test(url) ? `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75` : url;
}

interface ProductImageSliderProps {
  images: string[];
  alt: string;
  priority?: boolean;
}

/**
 * В галерее товара теперь могут быть и видео. Ролик в карточке каталога
 * играет без звука и по кругу, как превью; controls не показываем —
 * на карточке это ссылка на товар, а не плеер.
 */
function Media({ url, alt, eager }: { url: string; alt: string; eager: boolean }) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        aria-label={alt}
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <img
      src={cardSrc(url)}
      onError={(e) => { const el = e.currentTarget; if (el.src !== url) el.src = url; }}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
      loading={eager ? 'eager' : 'lazy'}
    />
  );
}

export default function ProductImageSlider({ images, alt, priority = false }: ProductImageSliderProps) {
  const validImages = images.filter(Boolean);
  const src = validImages[0] || '/placeholder-product.svg';

  if (validImages.length <= 1) {
    return (
      <div className="overflow-hidden h-64 w-full bg-surface">
        <Media url={src} alt={alt} eager={priority} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden h-64 w-full bg-surface">
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        className="w-full h-full"
        loop={true}
      >
        {validImages.map((url, index) => (
          <SwiperSlide key={index} className="h-full w-full">
            <Media url={url} alt={`${alt} — ${index + 1}`} eager={priority && index === 0} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}