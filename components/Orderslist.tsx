'use client';

import { Order, OrderItem } from '@/contexts/OrderContext';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrdersListProps {
    orders: Order[];
}

export default function OrdersList({ orders }: OrdersListProps) {
    const { t, language } = useLanguage();

    return (
        <div className="space-y-6">
            {orders.map((order, index) => {
                const subtotal = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const shippingCost = order.length > 0 ? (order[0] as OrderItem).shippingCost : 0;
                const total = subtotal + shippingCost;

                return (
                    <div key={index} className="bg-gray-800 rounded-lg p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-lime-400 mb-4">{t('orders.order')} #{index + 1}</h2>
                        <div className="divide-y divide-gray-700">
                            {order.map((item: OrderItem) => {
                                const title = language === 'en' && item.title_en ? item.title_en : item.title;
                                return (
                                    <div key={item.id} className="flex items-center justify-between py-4">
                                        <Link href={`/products/${item.categoryKey}/${item.id}`} className="flex items-center gap-4 group">
                                            {item.image_url && (
                                                <img src={item.image_url} alt={title} className="h-16 w-16 rounded-md object-cover" />
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-white group-hover:text-lime-400 transition-colors">{title}</h3>
                                                <p className="text-gray-400">{t('orders.quantity')}: {item.quantity}</p>
                                            </div>
                                        </Link>
                                        <p className="font-semibold text-white">₾{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-700 space-y-2 text-right">
                            <div className="flex justify-between text-gray-400">
                                <span>{t('orders.subtotal')}:</span>
                                <span>₾{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>{t('orders.shipping')}:</span>
                                {shippingCost > 0 ? (
                                    <span>₾{shippingCost.toFixed(2)}</span>
                                ) : (
                                    <span className="font-semibold text-lime-500">{t('orders.free')}</span>
                                )}
                            </div>
                            <div className="flex justify-between text-lg font-bold text-white">
                                <span>{t('orders.total')}:</span>
                                <span>₾{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
