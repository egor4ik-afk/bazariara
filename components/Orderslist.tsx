'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Order {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  address: string;
  total: number;
  items: any[]; // Consider defining a type for items
  status: string;
}

async function fetchOrders(phone: string): Promise<Order[]> {
  // In a real app, you would fetch this from your API
  // For now, returning mock data
  return [
    {
      id: 1,
      created_at: '2023-10-27T10:00:00Z',
      name: 'John Doe',
      phone: phone,
      address: '123 Main St, Anytown, USA',
      total: 150.00,
      items: [{ name: 'Product 1', quantity: 2, price: 50 }, { name: 'Product 2', quantity: 1, price: 50 }],
      status: 'Delivered'
    },
  ];
}

export default function OrdersList() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleFetchOrders = async () => {
    if (!phone) {
      setError(t('orders.phoneRequired'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedOrders = await fetchOrders(phone);
      setOrders(fetchedOrders);
    } catch (err) {
      setError(t('orders.fetchError'));
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div className="bg-white shadow-lg rounded-xl p-6">
        <h2 className="text-2xl font-bold text-ink-900 mb-4">{t('orders.title')}</h2>
        <p className="text-ink-600 mb-6">{t('orders.description')}</p>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('orders.phonePlaceholder')}
            className="flex-grow px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleFetchOrders}
            disabled={isLoading}
            className="px-6 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-500 disabled:bg-brand-300 transition-colors"
          >
            {isLoading ? t('orders.loading') : t('orders.findButton')}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="mt-8 space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white shadow-md rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg text-ink-900">{t('orders.order')} #{order.id}</p>
                <p className="text-sm text-ink-500">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {order.status}
              </span>
            </div>
            <div className="mt-4 border-t pt-4">
              <p><span className="font-semibold">{t('orders.total')}:</span> {order.total} ₾</p>
              <p><span className="font-semibold">{t('orders.address')}:</span> {order.address}</p>
              <div className="mt-2">
                <p className="font-semibold">{t('orders.items')}:</p>
                <ul className="list-disc list-inside text-ink-600">
                  {order.items.map(item => (
                    <li key={item.name}>{item.name} x{item.quantity}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
