import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Оформление заказа',
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
    canonical: 'https://bazariara.ge/checkout',
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
