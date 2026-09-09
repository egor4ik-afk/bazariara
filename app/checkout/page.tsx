'use client';
import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { createOrder } from './actions';
import { toast } from 'react-toastify';

const FREE_SHIPPING_THRESHOLD = 150;
const SHIPPING_COST = 20;

const getSocialOptions = (t: (key: string) => string) => [
    { key: 'telegram', label: 'Telegram', selectedColor: 'bg-blue-500', hoverColor: 'hover:bg-blue-500' },
    { key: 'whatsapp', label: 'WhatsApp', selectedColor: 'bg-green-500', hoverColor: 'hover:bg-green-500' },
    { key: 'instagram', label: 'Instagram', selectedColor: 'bg-pink-500', hoverColor: 'hover:bg-pink-500' },
];

// Simple Spinner component
const Spinner = () => (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
);

export default function CheckoutPage() {
    const { cartItems, clearCart } = useCart();
    const { addOrder } = useOrder();
    const router = useRouter();
    const { t, language } = useLanguage();
    const [socialMedia, setSocialMedia] = useState({ telegram: '', whatsapp: '', instagram: '' });
    const [selectedSocial, setSelectedSocial] = useState<string[]>([]);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Используем состояние для хранения checkoutItems
    const [checkoutItems, setCheckoutItems] = useState(cartItems);

    const cartCount = checkoutItems.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : subtotal > 0 ? SHIPPING_COST : 0;
    const total = subtotal + shippingCost;

    useEffect(() => {
        // Если корзина пуста при загрузке, перенаправляем
        if (cartItems.length === 0) {
            router.push('/');
        } else {
            // Устанавливаем checkoutItems из cartItems при загрузке
            setCheckoutItems(cartItems);
        }
    }, [cartItems, router]);
    

    const handleSocialSelect = (platform: string) => {
      const isSelected = selectedSocial.includes(platform);
      if (isSelected) {
          setSelectedSocial(selectedSocial.filter(p => p !== platform));
          setSocialMedia(prev => ({...prev, [platform]: ''}));
      } else {
          setSelectedSocial([...selectedSocial, platform]);
      }
  };

  const handleSocialMediaInputChange = (platform: string, value: string) => {
      setSocialMedia(prev => ({...prev, [platform]: value}));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Удаляем все нечисловые символы
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkoutItems.length === 0) {
      toast.error(t('checkout.noItemsError'));
      return;
  }

    setIsSubmitting(true);
    const orderData = {
        name,
        phone,
        socialMedia,
        items: checkoutItems.map(item => ({
          id: item.id,
          title: item.title,
          title_en: item.title_en,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          image_url: item.image_url
        })),
    };
    
    try {
      await createOrder(orderData, language);
      addOrder(checkoutItems);
      clearCart();
      router.push('/order-success');
    } catch (error) {
      console.error(error);
      toast.error(t('checkout.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const socialOptions = getSocialOptions(t);

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900 p-4 md:p-12">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-brand-700">{t('checkout.title')}</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('checkout.yourOrder', { count: cartCount })}</h2>
          {checkoutItems.length > 0 ? (
            <ul className="divide-y divide-ink-200">
              {checkoutItems.map((item, idx) => {
                const title = language === 'en' && item.title_en ? item.title_en : item.title;
                return (
                  <li key={`${item.id}-${idx}`} className="py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <img src={item.image_url} alt={title} className="w-16 h-16 object-cover rounded-md mr-4" />
                        <div>
                        <h3 className="font-semibold">{title}</h3>
                        <p className="text-ink-600">{item.quantity} x ₾{item.price.toFixed(2)}</p>
                        </div>
                    </div>
                    <span className="font-semibold">₾{(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-ink-600">{t('checkout.empty')}</p>
          )}
           <div className="mt-6 pt-4 border-t border-ink-200">
              <div className="flex justify-between text-ink-600 mb-2">
                <span>{t('checkout.subtotal')}</span>
                <span>₾{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ink-600 mb-4">
                <span>{t('checkout.shipping')}</span>
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span className="font-semibold text-brand-700">{t('checkout.free')}</span>
                ) : (
                  <span>₾{shippingCost.toFixed(2)}</span>
                )}
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span>{t('checkout.total')}</span>
                <span>₾{total.toFixed(2)}</span>
              </div>
            </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-2">{t('checkout.contactDetails')}</h2>
            <p className="text-sm text-ink-600 mb-6">{t('checkout.contactHint')}</p>
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label htmlFor="name" className="block text-ink-700 mb-2 font-medium">{t('checkout.name')}</label>
                    <input 
                        type="text" 
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-ink-100 border border-ink-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300"
                        required
                    />
                </div>
                
                <div className="mb-6">
                    <label htmlFor="phone" className="block text-ink-700 mb-2 font-medium">{t('checkout.phone')}</label>
                    <div className="flex items-center bg-ink-100 border border-ink-300 rounded-lg focus-within:ring-2 focus-within:ring-brand-500 transition-all duration-300">
                        <div className="flex items-center pl-4 pr-3 pointer-events-none">
                            <img src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f1ec-1f1ea.png" alt="Georgia Flag" className="w-6 h-6 mr-2"/>
                            <span className="text-ink-900 font-medium">+995</span>
                        </div>
                        <input 
                            type="tel" 
                            id="phone"
                            value={phone}
                            onChange={handlePhoneChange}
                            className="flex-1 bg-transparent px-4 py-3 text-ink-900 placeholder-gray-400 focus:outline-none"
                            placeholder={t('checkout.phonePlaceholder')}
                            maxLength={9}
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-ink-700 mb-4 font-medium text-center">{t('checkout.socialNetworks')}</label>
                    <div className="flex justify-center flex-wrap gap-3 mb-4">
                        {socialOptions.map(({ key, label, selectedColor, hoverColor }) => {
                            const isSelected = selectedSocial.includes(key);
                            return (
                                <div
                                key={key}
                                className={`flex items-center justify-center px-4 py-2 rounded-full cursor-pointer border-2 transition-all duration-200 
                                ${isSelected
                                    ? `${selectedColor} border-transparent text-ink-900 font-bold`
                                    : `bg-ink-100 border-ink-300 ${hoverColor} hover:border-transparent`
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    id={`checkbox-${key}`}
                                    checked={isSelected}
                                    onChange={() => handleSocialSelect(key)}
                                    className="sr-only"
                                />
                                <label htmlFor={`checkbox-${key}`} className="cursor-pointer">{label}</label>
                                </div>
                            );
                        })}
                    </div>

                    {selectedSocial.map(p => (
                        <div key={`${p}-input`} className="mb-4">
                            <label htmlFor={p} className="block text-ink-700 mb-2 font-medium capitalize">{p}</label>
                             <input 
                                type="text" 
                                id={p}
                                value={socialMedia[p as keyof typeof socialMedia]}
                                onChange={(e) => handleSocialMediaInputChange(p, e.target.value)}
                                className="w-full bg-ink-100 border border-ink-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300"
                                placeholder={
                                    p === 'telegram' ? t('checkout.telegramPlaceholder') :
                                    p === 'whatsapp' ? t('checkout.whatsappPlaceholder') :
                                    p === 'instagram' ? t('checkout.instagramPlaceholder') : ''
                                }
                            />
                        </div>
                    ))}
                </div>

                <button 
                    type="submit" 
                    className="w-full bg-brand-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-600/30 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
                    disabled={isSubmitting || checkoutItems.length === 0}
                >
                    {isSubmitting ? <Spinner /> : t('checkout.submitOrder')}
                </button>
            </form>
        </div>
      </main>
    </div>
  );
}
