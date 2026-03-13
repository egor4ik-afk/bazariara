import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Заказ оформлен',
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
    canonical: 'https://bazariara.ge/order-success',
  },
};

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
