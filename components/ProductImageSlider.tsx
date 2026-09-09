'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface ProductImageSliderProps {
  images: string[];
  alt: string;
  priority?: boolean;
}

export default function ProductImageSlider({ images, alt, priority = false }: ProductImageSliderProps) {
  const validImages = images.filter(Boolean);
  const src = validImages[0] || '/placeholder.png';

  if (validImages.length <= 1) {
    return (
      <div className="overflow-hidden h-64 w-full bg-surface">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
          loading={priority ? 'eager' : 'lazy'}
        />
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
            <img
              src={url}
              alt={`${alt} — фото ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
              loading={priority && index === 0 ? 'eager' : 'lazy'}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}