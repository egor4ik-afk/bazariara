'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export function FacebookPixelEvents() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  return null;
}
