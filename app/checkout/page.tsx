'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrderContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { handlePlaceOrder } from './actions';

const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_COST = 20;

const getSocialOptions = (t: (key: string) => string) => [
    { key: 'telegram', label: t('checkout.telegram'), selectedColor: 'bg-sky-500', hoverColor: 'hover:bg-sky-600' },
    { key: 'whatsapp', label: t('checkout.whatsapp'), selectedColor: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
    { key: 'facebook', label: t('checkout.facebook'), selectedColor: 'bg-blue-600', hoverColor: 'hover:bg-blue-700' },
];

// Simple Spinner component
const Spinner = () => (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
);

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [socialMedia, setSocialMedia] = useState({
    telegram: '',
    whatsapp: '',
    facebook: '',
  });
  const [selectedSocial, setSelectedSocial] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable copy of cartItems for this render
  const [checkoutItems, setCheckoutItems] = useState(cartItems);

  useEffect(() => {
    // When the component mounts, or when cartItems changes,
    // update our stable local copy. This freezes the cart state for this checkout attempt.
    setCheckoutItems(cartItems);
  }, [cartItems]);

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shippingCost;
  const cartCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const socialOptions = getSocialOptions(t);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const digits = input.replace(/[^0-9]/g, '');
    setPhone(digits);
  };

  const handleSocialMediaInputChange = (platform: string, value: string) => {
    setSocialMedia(prev => ({ ...prev, [platform]: value }));
  };

  const handleSocialCheckboxChange = (platform: string) => {
    setSelectedSocial(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsSubmitting(true);
    setError(null);

    const socialContactProvided = selectedSocial.some(p => socialMedia[p as keyof typeof socialMedia]);

    if (!name || (!phone && !socialContactProvided)) {
      setError(t('checkout.errorContactRequired'));
      setIsSubmitting(false);
      return;
    }

    if (checkoutItems.length === 0) {
        setError(t('checkout.errorEmptyCart'));
        setIsSubmitting(false);
        return;
    }

    const fullPhoneNumber = phone ? `+995${phone}` : '';
    const socialContacts = selectedSocial.reduce((acc, p) => {
        if (socialMedia[p as keyof typeof socialMedia]) {
            acc[p] = socialMedia[p as keyof typeof socialMedia];
        }
        return acc;
    }, {} as Record<string, string>);

    const orderDetails = {
      customer: { name, phone: fullPhoneNumber, social: socialContacts },
      items: checkoutItems.map(item => ({
        product: {
          id: item.id,
          title: item.title,
          title_en: item.title_en, // Pass english title
          price: item.price,
          category: item.category,
          categoryKey: item.categoryKey,
          image_url: item.image_url,
        },
        quantity: item.quantity,
      })), 
      total,
      shippingCost,
    };

    try {
      const result = await handlePlaceOrder(orderDetails);
      if (result.success) {
        addOrder(checkoutItems.map(item => ({...item, shippingCost: shippingCost})));
        clearCart();
        router.push('/order-success');
      } else {
        throw new Error(result.message || t('checkout.errorOrderFailed'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900 p-4 md:p-12">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-brand-700">{t('checkout.title')}</h1>
        
        <div className="bg-surface rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">{t('checkout.yourOrder', { count: cartCount })}</h2>
          {checkoutItems.length > 0 ? (
            <ul className="divide-y divide-ink-200">
              {checkoutItems.map((item, idx) => {
                const title = language === 'en' && item.title_en ? item.title_en : item.title;
                return (
                    <li key={`${item.categoryKey}-${item.id}-${idx}`} className="py-4 flex items-center justify-between">
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
              <div className="flex justify-between font-bold text-2xl">
                <span>{t('checkout.total')}</span>
                <span>₾{total.toFixed(2)}</span>
              </div>
            </div>
        </div>

        <div className="bg-surface rounded-lg shadow-lg p-8">
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
                            <label
                                key={key}
                                className={`flex items-center justify-center px-4 py-2 rounded-full cursor-pointer border-2 transition-all duration-200 
                                ${isSelected
                                    ? `${selectedColor} border-transparent text-ink-900 font-bold`
                                    : `bg-ink-100 border-ink-300 ${hoverColor} hover:border-transparent`
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSocialCheckboxChange(key)}
                                    className="absolute opacity-0 pointer-events-none"
                                />
                                <span className="text-sm select-none">{label}</span>
                            </label>
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
                                    t('checkout.profileLinkPlaceholder')
                                }
                            />
                        </div>
                    ))}
                </div>
                
                {error && <p className="text-clay text-center mb-6 p-3 bg-clay/10 border border-clay/30 rounded-lg">{error}</p>}

                <button 
                    type="submit" 
                    className="w-full bg-brand-600 text-on-brand font-bold py-3 px-6 rounded-lg hover:bg-brand-500 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-brand-600/30 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
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