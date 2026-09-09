'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface ProductImageSliderProps {
  images: string[];
  alt: string;
  priority?: boolean;
}

export default function ProductImageSlider({ images, alt, priority = false }: ProductImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      {/* Main Image */}
      <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg">
        {images.map((src, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
            <Image
              src={src || '/placeholder.png'}
              alt={`${alt} - image ${index + 1}`}
              layout="fill"
              objectFit="cover"
              priority={priority && index === 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50">
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Thumbnail Bar */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full">
          {images.map((src, index) => (
            <button 
              key={index} 
              onClick={() => setCurrentIndex(index)} 
              className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-300 ${currentIndex === index ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}>
              <Image src={src || '/placeholder.png'} alt={`thumbnail ${index + 1}`} layout="fill" objectFit="cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
