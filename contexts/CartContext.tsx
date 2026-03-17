'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ProductInCart = {
  id: string;
  title: string;
  title_en?: string;
  price: number;
  image_url?: string;
  quantity: number;
  category: string;
  category_en?: string;
  categoryKey: string;
  sub_category?: string;
  sub_category_en?: string;
  subCategoryKey?: string;
};

// CartContext.tsx — обновить тип Product
export type Product = {
  id: string;
  external_id?: string;
  categoryKey: string;
  subCategoryKey?: string;
  title: string;
  title_en?: string;
  title_ka?: string;
  description?: string;
  description_en?: string;
  description_ka?: string;
  category: string;
  category_en?: string;
  category_ka?: string;
  sub_category?: string;
  sub_category_en?: string;
  sub_category_ka?: string;
  price: number;
  in_stock: boolean;
  currency?: string;
  image_url?: string;
  image_urls?: string[];
  links?: string[];
};

type CartContextType = {
  cartItems: ProductInCart[];
  addToCart: (item: Product) => void;
  removeFromCart: (itemId: string, category: string) => void;
  updateQuantity: (itemId: string, quantity: number, category: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<ProductInCart[]>([]);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        if (Array.isArray(parsedCart) && parsedCart.every(item => 'categoryKey' in item)) {
          // Приводим price к числу при загрузке из localStorage
          setCartItems(parsedCart.map(item => ({
            ...item,
            price: parseFloat(String(item.price)) || 0,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to parse cart from localStorage', error);
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(
        i => i.id === item.id && i.category === item.category
      );
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id && i.category === item.category
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else {
        const { description, description_en, in_stock, ...cartItemData } = item;
        return [
          ...prevItems,
          {
            ...cartItemData,
            // Всегда число — независимо от того что пришло из Neon
            price: parseFloat(String(item.price)) || 0,
            quantity: 1,
          },
        ];
      }
    });
  };

  const removeFromCart = (itemId: string, category: string) => {
    setCartItems(prev =>
      prev.filter(item => !(item.id === itemId && item.category === category))
    );
  };

  const updateQuantity = (itemId: string, quantity: number, category: string) => {
    if (quantity <= 0) {
      removeFromCart(itemId, category);
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId && item.category === category
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};