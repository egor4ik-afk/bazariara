'use client';

import { useOrders } from '@/contexts/OrderContext';
import OrdersList from '@/components/Orderslist';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OrdersPage() {
    const { orders } = useOrders();
    const { t } = useLanguage();

    return (
        <div className="bg-cream-100 min-h-screen text-ink-900 p-4 md:p-12">
            <main className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center text-brand-700">{t('orders.title')}</h1>
                {orders.length > 0 ? (
                    <OrdersList orders={orders} />
                ) : (
                    <div className="text-center bg-surface p-8 rounded-lg shadow-lg">
                        <p className="text-xl text-ink-600">{t('orders.noOrders')}</p>
                        <p className="text-ink-500 mt-2">{t('orders.noOrdersHint')}</p>
                    </div>
                )}
            </main>
        </div>
    );
}
