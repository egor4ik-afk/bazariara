import Link from 'next/link';

export const metadata = {
  title: 'Наши Фермеры | Bazariara',
  description: 'Познакомьтесь с нашими фермерами и их натуральными продуктами.',
};

export default function FarmersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-ink-900">Наши Фермеры</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/farmers/chventan" className="bg-surface rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group border border-ink-200 block">
          <div className="aspect-video relative bg-green-50 flex items-center justify-center">
            <span className="text-6xl group-hover:scale-110 transition-transform duration-300">🍇</span>
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-3 text-ink-900 group-hover:text-brand-700 transition-colors">CH’VENTAN / ჩვ’უენთან</h2>
            <p className="text-ink-600 line-clamp-3">
              CH’VENTAN родился в Кахетии, в селе Мсхалгори, среди виноградников, садов и лесов. 
              Само название «ჩვ’უენთან» по-грузински звучит почти как приглашение — «к нам».
            </p>
            <div className="mt-4 text-brand-700 font-medium flex items-center">
              Читать историю и смотреть товары
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}