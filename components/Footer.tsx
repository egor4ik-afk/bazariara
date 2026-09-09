import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from '@/navigation';


const navigation = {
  main: [
    { name: 'nav.home', href: '/' },
    { name: 'nav.farmers', href: '/farmers' },
    { name: 'nav.gifts', href: '/gostintsy-iz-gruzii' },
    { name: 'nav.powerbanks', href: '/powerbank-i-zaryadki' },
  ],
  legal: [
    { name: 'nav.privacy', href: '/privacy-policy' },
    { name: 'nav.terms', href: '/terms-of-service' },
    { name: 'nav.contact', href: 'mailto:d.basilia@gmail.com' },
  ],
};

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-cream-200 text-ink-800">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and short description */}
          <div className="md:col-span-1">
            <h2 className="text-2xl font-bold text-ink-900">BAZARI ARA</h2>
            <p className="mt-2 text-sm text-ink-600 max-w-xs">
              {t('footer.description')}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-8 col-span-2 md:col-span-2">
            <div>
              <h3 className="font-semibold text-ink-900">{t('footer.menu')}</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {navigation.main.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-ink-600 hover:text-brand-700 transition-colors">
                      {t(item.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-ink-900">{t('footer.legal')}</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {navigation.legal.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-ink-600 hover:text-brand-700 transition-colors">
                      {t(item.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-ink-200/50 text-center text-sm text-ink-500">
          <p>&copy; {new Date().getFullYear()} BAZARI ARA. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}
