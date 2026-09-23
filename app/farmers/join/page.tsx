// FILE: app/farmers/join/page.tsx
//
// Отдельная страница анкеты (ТЗ v1.0, раздел 3). Раньше форма жила только
// внизу главной — сослаться на неё из меню, подвала или раздела «Фермеры»
// было нельзя. Теперь у неё свой адрес, и на неё ведут все CTA.

import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import ProducerApplicationForm from '@/components/ProducerApplicationForm';

type Locale = 'ru' | 'en' | 'ka';

const COPY = {
  ru: {
    title: 'Стать нашим фермером: анкета производителя',
    description: 'Небольшое хозяйство в Грузии? Расскажите о себе: мёд, чай, вино, специи или сухофрукты. Своя страница на сайте, каждую анкету читаем лично.',
    back: 'Все фермеры',
    h1: 'Стать нашим фермером',
    points: [
      'Работаем с небольшими хозяйствами: пасеки, чайные плантации, винодельни, сады.',
      'У вас будет своя страница с историей хозяйства и всем ассортиментом.',
      'Мы читаем каждую анкету и отвечаем лично — обычно в течение нескольких дней.',
    ],
  },
  en: {
    title: 'Become Our Farmer: Producer Application',
    description: 'A small farm in Georgia? Tell us about your honey, tea, wine, spices or dried fruit. Get your own page on the site; we read every application.',
    back: 'All farmers',
    h1: 'Become our farmer',
    points: [
      'We work with small farms: apiaries, tea plantations, wineries, orchards.',
      'You get your own page with the farm story and your full range.',
      'We read every application and reply personally, usually within a few days.',
    ],
  },
  ka: {
    title: 'გახდით ჩვენი ფერმერი: ანკეტა',
    description: 'მცირე მეურნეობა საქართველოში? მოგვიყევით თქვენს თაფლზე, ჩაიზე, ღვინოზე ან სანელებლებზე. საკუთარი გვერდი საიტზე, ყველა ანკეტას ვკითხულობთ.',
    back: 'ყველა ფერმერი',
    h1: 'გახდით ჩვენი ფერმერი',
    points: [
      'ვმუშაობთ მცირე მეურნეობებთან: საფუტკრეები, ჩაის პლანტაციები, მარნები.',
      'გექნებათ საკუთარი გვერდი მეურნეობის ისტორიით და ასორტიმენტით.',
      'ყველა ანკეტას ვკითხულობთ და ვპასუხობთ პირადად.',
    ],
  },
} as const;

function getLocale(h: Headers): Locale {
  const l = h.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: `https://bazariara.ge/${locale}/farmers/join`,
      languages: {
        ru: 'https://bazariara.ge/ru/farmers/join',
        en: 'https://bazariara.ge/en/farmers/join',
        ka: 'https://bazariara.ge/ka/farmers/join',
      },
    },
  };
}

export default async function JoinPage() {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];

  return (
    <div className="bg-cream-100 min-h-screen text-ink-900">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
        <Link href={`/${locale}/farmers`} className="text-sm text-ink-500 hover:text-brand-700">
          ← {c.back}
        </Link>

        <h1 className="text-3xl md:text-4xl font-extrabold mt-4 mb-6">{c.h1}</h1>

        <ul className="space-y-2 mb-8">
          {c.points.map((p) => (
            <li key={p} className="flex gap-3 text-ink-700 leading-relaxed">
              <span className="text-brand-600 font-bold shrink-0" aria-hidden="true">✓</span>
              {p}
            </li>
          ))}
        </ul>

        <ProducerApplicationForm locale={locale} startOpen />
      </main>
    </div>
  );
}
