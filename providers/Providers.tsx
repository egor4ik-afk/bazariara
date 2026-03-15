'use client'
import React from 'react'
import { CartProvider } from '@/contexts/CartContext'
import { OrderProvider } from '@/contexts/OrderContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <OrderProvider>
        {children}
      </OrderProvider>
    </CartProvider>
  )
}