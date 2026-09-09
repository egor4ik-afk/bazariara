import { PrismaClient } from '@prisma/client';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

const prisma = new PrismaClient();

export const metadata = {
  title: 'CH’VENTAN / ჩვ’უენთან | Фермеры Bazariara',
  description: 'История бренда CH’VENTAN и их натуральные грузинские продукты.',
};

export const revalidate = 60; // Обновляем данные раз в минуту

export default async function ChventanPage() {
  // Вытягиваем товары фермера по их slug (будут добавлены скриптом ниже)
  const products = await prisma.product.findMany({
    where: {
      slug: {
        in: [
          'chventan-tkemali-500', 
          'chventan-tkemali-310', 
          'chventan-wine-ambre', 
          'chventan-wine-red-2025',
          'corn-flour-farm',
          'tea-first-grade-40g',
          'tea-second-grade-40g'
        ]
      }
    }
  });

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl bg-white rounded-3xl shadow-sm mt-8">
        <Link href="/farmers" className="text-blue-600 hover:underline mb-8 block">← К списку фермеров</Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">CH’VENTAN <span className="text-gray-400 font-normal">/ ჩვ’უენთან</span></h1>
        
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p className="text-xl font-medium text-gray-900 border-l-4 border-blue-500 pl-4">
            CH’VENTAN родился в Кахетии, в селе Мсхалгори, среди виноградников, садов и лесов.
          </p>
          
          <p>Само название «ჩვ’უენთან» по-грузински звучит почти как приглашение — «к нам». И именно в этом заключается идея бренда: пригласить человека не просто попробовать грузинский продукт, а прикоснуться к месту, из которого он появился.</p>
          <p>Для меня CH’VENTAN — это больше, чем производство еды или вина. Это попытка сохранить настоящий вкус земли и создать вокруг него целый мир: виноградник, квеври, сад, сезонный урожай, домашние грузинские рецепты и жизнь ближе к природе.</p>
          <p>Все началось с земли и винограда. Постепенно рядом с будущим вином появились продукты, которые всегда были частью грузинского дома. Один из первых — ткемали. Мне хотелось сделать его таким, каким я сама люблю его есть: с ярким вкусом настоящей сливы, трав, специй — без ощущения промышленного соуса.</p>
          <p>В дальнейшем CH’VENTAN будет объединять натуральные продукты нашего хозяйства и небольшое винное производство. Для меня важно, чтобы за каждой бутылкой можно было увидеть не завод, а конкретное место, землю, урожай и человека, который это сделал.</p>
          
          <div className="bg-gray-100 rounded-2xl p-6 my-8">
            <p className="text-xl font-medium italic text-center text-gray-900 m-0">
              «CH’VENTAN — это вкус места, куда хочется приехать.»
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Особенности производства</h2>
          <p>Главный принцип CH’VENTAN — минимум промышленного вмешательства и максимум самого продукта. Мы работаем небольшими партиями и ориентируемся на сезонность сырья. Для нас важны происхождение ингредиентов, их вкус и качество, поэтому производство не строится по принципу массового стандартизированного продукта.</p>
          <p>Ткемали создается на основе настоящей грузинской сливы с традиционными травами и специями. Мы хотим сохранить естественную кислотность, аромат и характер ткемали — именно тот вкус, ради которого его едят в грузинских семьях.</p>
          <p>Производство связано с нашим хозяйством в Кахетии, поэтому в будущем ассортимент будет расширяться вместе с тем, что дает земля: фруктами, виноградом, травами и сезонным урожаем.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Каждый урожай — отдельная история</h2>
          <p>Отдельное направление CH’VENTAN — вино собственного производства. Виноград выращивается в Кахетии, а вино создается традиционным грузинским способом в квеври. Для нас здесь особенно важно сохранить характер конкретного урожая и терруара, поэтому мы не стремимся делать абсолютно одинаковое вино каждый год.</p>
        </div>

        {/* БЛОК С ТОВАРАМИ ФЕРМЕРА */}
        <div className="mt-16 pt-12 border-t border-gray-100">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Продукция фермы</h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic bg-gray-50 p-6 rounded-xl">Товары скоро появятся в продаже...</p>
          )}
        </div>
      </div>
    </div>
  );
}