'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { CONTACTS, CONTACT_LINKS } from '@/lib/contacts';

/**
 * Подвал переписан: был один ряд иконок и цепочка ссылок через «|»,
 * в которой не было ни блога, ни регионов, ни производителей — то есть
 * половину сайта нельзя было найти иначе как по прямому адресу.
 *
 * Стало три колонки: разделы, каталог, контакты. Это ещё и SEO-задача
 * из ТЗ 11: ссылки из подвала на регионы и производителей дают Google
 * путь к страницам длинного хвоста.
 */
const Footer = () => {
  const { t, language } = useLanguage();
  const L = (p: string) => `/${language}${p}`;

  const sections = [
    { href: L('/farmers'),  label: t('footer.farmers') },
    { href: L('/regions'),  label: t('footer.regions') },
    { href: L('/blog'),     label: t('footer.blog') },
  ];

  const catalog = [
    { href: L('/gostintsy-iz-gruzii'),      label: t('footer.gifts') },
    { href: L('/turisticheskoe-snaryazhenie'), label: t('footer.tourism') },
    { href: L('/powerbank-i-zaryadki'),     label: t('footer.powerbanks') },
  ];

  const legal = [
    { href: L('/returns'),          label: t('footer.returns') },
    { href: L('/privacy-policy'),   label: t('footer.privacy') },
    { href: L('/terms-of-service'), label: t('footer.terms') },
  ];

  const linkClass = 'block py-1.5 text-sm text-ink-600 hover:text-brand-700 transition-colors';

  return (
    <footer className="bg-surface border-t border-ink-200 mt-auto">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href={L('/')} className="text-lg font-extrabold text-ink-900">BAZARI ARA</Link>
            <p className="text-sm text-ink-600 mt-2 leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>

            <div className="flex gap-3 mt-4">
              <a href={CONTACT_LINKS.whatsapp} target="_blank" rel="noopener noreferrer"
                 aria-label="WhatsApp" className="text-brand-700 hover:text-brand-600 transition-colors">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.956-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </a>
              <a href={CONTACT_LINKS.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <Image src="/tg.png" alt="" width={28} height={28} className="hover:opacity-80 transition-opacity" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-2">
              {t('footer.sectionsTitle')}
            </h3>
            {sections.map((l) => <Link key={l.href} href={l.href} className={linkClass}>{l.label}</Link>)}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-2">
              {t('footer.catalogTitle')}
            </h3>
            {catalog.map((l) => <Link key={l.href} href={l.href} className={linkClass}>{l.label}</Link>)}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-2">
              {t('footer.contactsTitle')}
            </h3>
            <a href={CONTACT_LINKS.tel} className="block py-1.5 text-sm font-semibold text-ink-900 hover:text-brand-700 transition-colors">
              {CONTACTS.phoneDisplay}
            </a>
            <p className="text-sm text-ink-600 py-1.5">{t('footer.hours')}</p>
            {legal.map((l) => <Link key={l.href} href={l.href} className={linkClass}>{l.label}</Link>)}
          </div>
        </div>

        <p className="text-xs text-ink-500 mt-8 pt-6 border-t border-ink-200">
          {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
