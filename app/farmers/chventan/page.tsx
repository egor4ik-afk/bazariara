import { PrismaClient, products } from '@prisma/client';
import ProductCard from '@/components/ProductCard';
import { Metadata } from 'next';
import Link from 'next/link';

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: 'Ферма CH’VENTAN (ჩვ’უენთან): натуральные продукты из Кахетии | BAZARI ARA',
  description: 'Узнайте больше о ферме CH’VENTAN в кахетинском селе Мсхалгори. Мы производим натуральные продукты и вино по традиционным грузинским рецептам, с минимальным вмешательством и фокусом на сезонность.',
  openGraph: {
    title: 'Ферма CH’VENTAN (ჩვ’უენთან) | BAZARI ARA',
    description: 'Натуральные продукты и вино из Кахетии от фермы CH’VENTAN.',
    images: [
      {
        url: 'https://bazari-ara.com/og-image-chventan.png', //TODO: сделать картинку
        width: 1200,
        height: 630,
        alt: 'Ферма CH’VENTAN'
      }
    ]
  }
};

async function getChventanProducts(): Promise<products[]> {
  const chventanProducts = await prisma.products.findMany({
    where: {
      source: 'chventan',
      in_stock: true,
      price: {
        not: null, 
      },
      name: {
        not: ''
      }
    },
    orderBy: {
      name: 'asc'
    },
  });
  return chventanProducts;
}

export default async function ChventanPage() {
  const products = await getChventanProducts();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CH’VENTAN',
    description: 'CH’VENTAN — это вкус места, куда хочется приехать. Производство натуральных продуктов и вина в Кахетии.',
    url: 'https://bazari-ara.com/farmers/chventan',
    logo: 'https://bazari-ara.com/favicon-96x96.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+995-591-017-495',
      contactType: 'customer service'
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Мсхалгори',
      addressRegion: 'Кахетия',
      addressCountry: 'GE'
    }
  };

  return (
    <div className="bg-cream-100 min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl bg-white rounded-3xl shadow-sm mt-8">
        <Link href="/farmers" className="text-brand-700 hover:underline mb-8 block">← К списку фермеров</Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-ink-900 leading-tight">
          CH’VENTAN <span className="text-ink-600 font-normal">/ ჩვ’უენთან</span>
        </h1>
        
        <div className="prose prose-lg max-w-none text-ink-700 space-y-6">
          <p className="text-xl font-medium text-ink-900 border-l-4 border-brand-500 pl-4">
            CH’VENTAN родился в Кахетии, в селе Мсхалгори, среди виноградников, садов и лесов.
          </p>
          
          <p>Само название «ჩვ’უენთან» по-грузински звучит почти как приглашение — «к нам». И именно в этом заключается идея бренда: пригласить человека не просто попробовать грузинский продукт, а прикоснуться к месту, из которого он появился.</p>
          <p>Для меня CH’VENTAN — это больше, чем производство еды или вина. Это попытка сохранить настоящий вкус земли и создать вокруг него целый мир: виноградник, квеври, сад, сезонный урожай, домашние грузинские рецепты и жизнь ближе к природе.</p>
          
          <div className="bg-cream-200 rounded-2xl p-6 my-8">
            <p className="text-xl font-medium italic text-center text-ink-900 m-0">
              «CH’VENTAN — это вкус места, куда хочется приехать.»
            </p>
          </div>

          <h2 className="text-2xl font-bold text-ink-900 mt-8 mb-4">Особенности производства</h2>
          <p>Главный принцип CH’VENTAN — минимум промышленного вмешательства и максимум самого продукта. Мы работаем небольшими партиями и ориентируемся на сезонность сырья.</p>
          <p>Отдельное направление CH’VENTAN — вино собственного производства. Виноград выращивается в Кахетии, а вино создается традиционным грузинским способом в квеври.</p>
        </div>

        {/* БЛОК С ТОВАРАМИ ФЕРМЕРА */}
        <div className="mt-16 pt-12 border-t border-ink-200">
          <h2 className="text-3xl font-bold mb-8 text-ink-900">Продукция фермы</h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product, idx) => (
                <ProductCard key={product.id} product={product as any} index={idx} />
              ))}
            </div>
          ) : (
            <p className="text-ink-500 italic bg-cream-100 p-6 rounded-xl">Товары скоро появятся в продаже...</p>
          )}
        </div>
      </div>
    </div>
  );
}
