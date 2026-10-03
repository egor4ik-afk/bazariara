'use client';

import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { isVideoUrl } from '@/lib/media';

import { optimizedSrc } from '@/lib/img';

// Картинки в карточке — через оптимизатор, 640 px (с запасом на ретину), webp.
// Если оптимизатор не ответит, onError вернёт исходный файл.
const cardSrc = (url: string) => optimizedSrc(url, 640);

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
  // Слайды со 2-го рендерим, только когда человек потянулся к галерее
  // (навёл мышь или коснулся). Иначе браузер грузит их сразу: они стоят
  // справа от первого в пределах порога lazy-загрузки, и 20 карточек
  // тянули ~33 картинки вместо 20.
  const [armed, setArmed] = useState(false);
  const arm = () => { if (!armed) setArmed(true); };
  const src = validImages[0] || '/placeholder-product.svg';

  if (validImages.length <= 1) {
    return (
      <div className="overflow-hidden h-64 w-full bg-surface">
        <Media url={src} alt={alt} eager={priority} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden h-64 w-full bg-surface" onPointerEnter={arm} onTouchStart={arm} onFocus={arm}>
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        className="w-full h-full"
        loop={true}
        onSlideChange={arm}
      >
        {validImages.map((url, index) => (
          <SwiperSlide key={index} className="h-full w-full">
            {index === 0 || armed
              ? <Media url={url} alt={`${alt} — ${index + 1}`} eager={priority && index === 0} />
              : <div className="w-full h-full bg-surface" aria-hidden="true" />}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}