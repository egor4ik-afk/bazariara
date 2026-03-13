import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Корзина',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  alternates: {
    canonical: 'https://bazariara.ge/cart',
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
