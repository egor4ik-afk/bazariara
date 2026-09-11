'use client';

import { useState } from 'react';
import { submitApplication } from '@/app/actions-producers';

type Locale = 'ru' | 'en' | 'ka';

const COPY = {
  ru: {
    title: 'Хотите представить свой продукт на Bazari Ara?',
    lead: 'Мы работаем с небольшими грузинскими хозяйствами: пасеками, чайными плантациями, винодельнями, фермами. Расскажите о себе — свяжемся и обсудим.',
    open: 'Оставить заявку',
    name: 'Ваше имя', brand: 'Название хозяйства или бренда', phone: 'Телефон или мессенджер',
    region: 'Регион', products: 'Что производите', social: 'Сайт или Instagram',
    description: 'Расскажите о хозяйстве',
    required: 'обязательно', optional: 'необязательно',
    submit: 'Отправить заявку', sending: 'Отправляем…',
    ok: 'Спасибо! Заявка получена — свяжемся с вами в ближайшие дни.',
    note: 'Заявка не публикуется автоматически: мы читаем каждую и связываемся лично.',
  },
  en: {
    title: 'Want your product on Bazari Ara?',
    lead: 'We work with small Georgian farms: apiaries, tea plantations, wineries. Tell us about yourself and we will get in touch.',
    open: 'Send an application',
    name: 'Your name', brand: 'Farm or brand name', phone: 'Phone or messenger',
    region: 'Region', products: 'What you make', social: 'Website or Instagram',
    description: 'Tell us about your farm',
    required: 'required', optional: 'optional',
    submit: 'Send application', sending: 'Sending…',
    ok: 'Thank you! We have your application and will be in touch shortly.',
    note: 'Applications are not published automatically — we read each one and reply personally.',
  },
  ka: {
    title: 'გსურთ თქვენი პროდუქტი Bazari Ara-ზე?',
    lead: 'ჩვენ ვმუშაობთ მცირე ქართულ მეურნეობებთან: საფუტკრეებთან, ჩაის პლანტაციებთან, მარნებთან. მოგვწერეთ თქვენს შესახებ.',
    open: 'განაცხადის გაგზავნა',
    name: 'თქვენი სახელი', brand: 'მეურნეობის ან ბრენდის სახელი', phone: 'ტელეფონი ან მესენჯერი',
    region: 'რეგიონი', products: 'რას აწარმოებთ', social: 'ვებგვერდი ან Instagram',
    description: 'მოგვიყევით მეურნეობის შესახებ',
    required: 'სავალდებულო', optional: 'არასავალდებულო',
    submit: 'გაგზავნა', sending: 'იგზავნება…',
    ok: 'გმადლობთ! განაცხადი მიღებულია, მალე დაგიკავშირდებით.',
    note: 'განაცხადი ავტომატურად არ ქვეყნდება — თითოეულს ვკითხულობთ პირადად.',
  },
} as const;

export default function ProducerApplicationForm({ locale }: { locale: Locale }) {
  const c = COPY[locale];

  // Форма развёрнута не сразу: на главной это блок-призыв, а не анкета
  // на девять полей поперёк экрана.
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    contactName: '', brandName: '', phone: '', region: '',
    products: '', social: '', description: '', website: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setSending(true);
    setError(null);
    const res = await submitApplication(form);
    setSending(false);
    if (res.success) setDone(true);
    else setError(res.message || 'Ошибка');
  };

  const field = 'w-full px-3 py-2.5 rounded-lg bg-surface border border-ink-200 text-ink-900 text-sm outline-none focus:border-brand-400';
  const label = 'block text-xs font-semibold text-ink-600 mb-1.5';

  return (
    <div className="rounded-2xl bg-brand-50 border border-brand-200 p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-ink-900 mb-2">{c.title}</h2>
      <p className="text-ink-700 max-w-2xl mb-5 leading-relaxed">{c.lead}</p>

      {done ? (
        <p className="font-semibold text-brand-700">{c.ok}</p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-6 py-3 rounded-full bg-brand-600 text-on-brand font-bold
                     hover:bg-brand-500 transition-colors"
        >
          {c.open}
        </button>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className={label}>{c.name} · {c.required}</label>
            <input className={field} value={form.contactName} onChange={set('contactName')} />
          </div>
          <div>
            <label className={label}>{c.brand} · {c.required}</label>
            <input className={field} value={form.brandName} onChange={set('brandName')} />
          </div>
          <div>
            <label className={label}>{c.phone} · {c.required}</label>
            <input className={field} value={form.phone} onChange={set('phone')} inputMode="tel" />
          </div>
          <div>
            <label className={label}>{c.region} · {c.optional}</label>
            <input className={field} value={form.region} onChange={set('region')} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{c.products} · {c.required}</label>
            <input className={field} value={form.products} onChange={set('products')} placeholder="мёд, чай, вино…" />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{c.social} · {c.optional}</label>
            <input className={field} value={form.social} onChange={set('social')} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{c.description} · {c.optional}</label>
            <textarea className={field + ' min-h-[90px]'} value={form.description} onChange={set('description')} />
          </div>

          {/* Honeypot: скрыт от людей, боты заполняют всё подряд */}
          <input
            type="text" name="website" tabIndex={-1} autoComplete="off"
            value={form.website} onChange={set('website')}
            className="hidden" aria-hidden="true"
          />

          <div className="sm:col-span-2">
            {error && <p className="text-clay text-sm mb-3 font-medium">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="px-6 py-3 rounded-full bg-brand-600 text-on-brand font-bold
                         hover:bg-brand-500 transition-colors disabled:opacity-50"
            >
              {sending ? c.sending : c.submit}
            </button>
            <p className="text-xs text-ink-500 mt-3">{c.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
