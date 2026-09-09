'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
  const { t, language } = useLanguage();
  return (
    <footer className="bg-gray-800 text-white py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center space-x-4 mb-4">
          <a href="tel:+995591017495">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white hover:text-lime-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
          <a href="https://t.me/bazariarage" target="_blank" rel="noopener noreferrer">
            <Image src="/tg.png" alt="Telegram" width={32} height={32} className="hover:opacity-80 transition-opacity duration-300" />
          </a>
          <a href="https://wa.me/995591017945" target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-lime-500 hover:text-lime-400 transition-colors duration-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.956-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </a>
        </div>
        <div className="text-center mt-4 text-sm text-gray-500">
          <span>{t('footer.copyright')}</span>
          <span className="mx-2">|</span>
          <Link href={`/${language}/farmers`} className="underline hover:text-lime-400 transition-colors duration-300">
            {t('footer.farmers')}
          </Link>
          <span className="mx-2">|</span>
          <Link href={`/${language}/turisticheskoe-snaryazhenie`} className="underline hover:text-lime-400 transition-colors duration-300">
            {t('footer.tourism')}
          </Link>
          <span className="mx-2">|</span>
          <Link href={`/${language}/powerbank-i-zaryadki`} className="underline hover:text-lime-400 transition-colors duration-300">
            {t('footer.powerbanks')}
          </Link>
          <span className="mx-2">|</span>
          <Link href={`/${language}/gostintsy-iz-gruzii`} className="underline hover:text-lime-400 transition-colors duration-300">
            {t('footer.gifts')}
          </Link>
          <span className="mx-2">|</span>
          <Link href={`/${language}/returns`} className="underline hover:text-lime-400 transition-colors duration-300">
            {t('footer.returns')}
          </Link>
          <span className="mx-2">|</span>
          <Link href={`/${language}/privacy-policy`} className="underline hover:text-lime-400 transition-colors duration-300">
            {t('footer.privacy')}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
