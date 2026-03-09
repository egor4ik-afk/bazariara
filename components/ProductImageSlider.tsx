'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import Image from 'next/image';
import 'swiper/css';
import 'swiper/css/pagination';

export default function ProductImageSlider({ images, alt }: { images: string[], alt: string }) {
  if (images.length <= 1) {
    return (
      <div className="relative overflow-hidden h-64 w-full">
        <Image 
          src={images[0] || '/placeholder.png'} 
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden h-64 w-full">
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        className="w-full h-full"
        loop={true}
      >
        {images.map((url, index) => (
          <SwiperSlide key={index} className="relative h-full w-full">
            <Image 
              src={url} 
              alt={`${alt} - Фото ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}