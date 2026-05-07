'use client';

import { CartProvider } from '@/contexts/CartContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <OrderProvider>
        <CartProvider>{children}</CartProvider>
      </OrderProvider>
    </LanguageProvider>
  );
}
