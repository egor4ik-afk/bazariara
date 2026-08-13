// FILE: app/gostintsy-iz-gruzii/page.tsx
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/app/actions';
import ProductCard from '@/components/ProductCard';

const PATH = '/gostintsy-iz-gruzii';

const COPY = {
  ru: {
    title: 'Гостинцы из Грузии — мёд, чурчхела, чай, специи, открытки | Тбилиси | BAZARI ARA',
    description: 'Съедобные сувениры из Грузии в Тбилиси с доставкой за 2 часа: мёд из Кахетии и Рачи, чурчхела и пастила, грузинский чай, сванская соль и аджика, открытки с видами страны.',
    h1: 'Гостинцы из Грузии',
    intro: 'Уезжаете из Грузии и не знаете, что привезти? Самый честный сувенир — тот, который можно съесть. Мы собрали продукты из разных регионов страны: мёд с пасек Кахетии, Рачи, Имерети, Джавахети и Тори, чурчхелу и пастилу, чай из Гурии и Аджарии, сванскую соль и мегрельскую аджику. Всё компактно упаковано и спокойно переживает дорогу в чемодане.',
    intro2: 'Каждый продукт связан с конкретным регионом, и это не маркетинг: каштановый мёд из Рачи и акациевый из Имерети отличаются по вкусу так же заметно, как имеретинская чурчхела на кукурузной муке отличается от кахетинской на пшеничной. Доставим по Тбилиси за 2 часа — можно заказать вечером накануне вылета.',
    honey: 'Мёд из Грузии',
    honeyText: 'Пять сортов из пяти регионов, все по 300 грамм. Цветочный из Кахетии — разнотравный, вкус меняется от сезона к сезону. Крем-мёд из Джавахети — с бархатистой текстурой, удобно намазывать. Сосновый из Тори — падевый, с древесными и смолистыми нотами вместо привычной цветочной сладости. Каштановый из Рачи — тёмный, с характерной лёгкой горчинкой. Акациевый из Имерети — светлый, деликатный, долго не кристаллизуется.',
    sweets: 'Чурчхела и пастила',
    sweetsText: 'Кахетинская чурчхела с грецким орехом — плотная, на пшеничной татаре. Имеретинская с фундуком — тонкая, на кукурузной муке, в подарочной коробке. Пастила из яблока, чернослива и ткемали — фрукт в концентрированном виде, без лишнего сахара.',
    tea: 'Грузинский чай',
    teaText: 'Чёрный с гранатом из Гурии и зелёный с жасмином из Аджарии — оба в подарочной упаковке. Западная Грузия исторически чайный регион: влажный субтропический климат подходит для чайного куста не хуже, чем для винограда — восточная часть страны.',
    spices: 'Специи и приправы',
    spicesText: 'Сванская соль — чеснок, горные травы и специи, включая gitsruli. Мегрельская аджика из Зугдиди — острая, но острота здесь не главное, а многослойный пряный аромат. Плюс набор специй в подарочной коробке, если хочется попробовать всё сразу.',
    cards: 'Открытки',
    cardsText: 'Пейзажи и городские виды от Сванетии до Аджарии: Ушгули, долина Алазани, Батуми, Гергети на фоне Казбека, старый Тбилиси. Поштучно или набором из пяти — набор выходит дешевле.',
    empty: 'Пока нет товаров в этом разделе.',
    faqTitle: 'Частые вопросы',
    faq: [
      { q: 'Можно ли увезти мёд из Грузии в самолёте?',
        a: 'Мёд — это жидкость с точки зрения авиаправил, поэтому в ручную кладь банка 300 г не пройдёт (лимит 100 мл на ёмкость). В багаж — без ограничений. Уточняйте правила ввоза в стране назначения: в ЕС продукты животного происхождения из третьих стран ограничены.' },
      { q: 'Сколько хранится чурчхела?',
        a: 'Чурчхела сушится и хранится месяцами при комнатной температуре в сухом месте. Пастила — так же. Это изначально продукты длительного хранения: их придумали, чтобы сохранить урожай винограда и фруктов до следующего сезона.' },
      { q: 'Мёд закристаллизовался — он испортился?',
        a: 'Нет. Кристаллизация — естественный процесс для натурального мёда, скорость зависит от состава нектара. Акациевый остаётся жидким дольше других, каштановый и цветочный густеют быстрее.' },
      { q: 'Что выбрать в подарок, если не знаешь вкусов человека?',
        a: 'Набор специй в коробке или чай в подарочной упаковке — они подходят почти всем. Из мёда самый универсальный акациевый: мягкий, без горчинки. Из сладкого — имеретинская чурчхела в коробке, её удобно везти.' },
      { q: 'Доставляете по Тбилиси?',
        a: 'Да, за 2 часа. Стоимость доставки — 10 ₾. Работаем ежедневно с 09:00 до 21:00.' },
    ],
  },
  en: {
    title: 'Georgian Food Souvenirs — Honey, Churchkhela, Tea, Spices | Tbilisi | BAZARI ARA',
    description: 'Edible souvenirs from Georgia delivered across Tbilisi in 2 hours: honey from Kakheti and Racha, churchkhela and pastila, Georgian tea, Svan salt and adjika, postcards.',
    h1: 'Georgian Food Souvenirs',
    intro: 'Leaving Georgia and not sure what to bring home? The most honest souvenir is one you can eat. We have gathered products from across the country: honey from apiaries in Kakheti, Racha, Imereti, Javakheti and Tori, churchkhela and pastila, tea from Guria and Adjara, Svan salt and Megrelian adjika. Everything packs small and travels well in a suitcase.',
    intro2: 'Each product belongs to a specific region, and that is not marketing: chestnut honey from Racha tastes as distinct from Imeretian acacia honey as Imeretian corn-flour churchkhela does from the Kakhetian wheat-flour version. Delivery across Tbilisi in 2 hours — order the evening before your flight.',
    honey: 'Georgian Honey',
    honeyText: 'Five varieties from five regions, 300 g each. Kakheti wildflower — multi-herb, changing with the season. Javakheti creamed honey — velvety and spreadable. Tori pine honeydew — woody and resinous rather than floral. Racha chestnut — dark, with a signature light bitterness. Imereti acacia — pale, delicate, slow to crystallise.',
    sweets: 'Churchkhela & Pastila',
    sweetsText: 'Kakheti churchkhela with walnuts — dense, made on wheat-flour tatara. Imeretian with hazelnuts — slim, made with corn flour, in a gift box. Apple, prune and tkemali pastila — concentrated fruit with no added sugar.',
    tea: 'Georgian Tea',
    teaText: 'Black with pomegranate from Guria and green with jasmine from Adjara, both in gift packs. Western Georgia is historically tea country: its humid subtropical climate suits the tea bush as well as the east suits the vine.',
    spices: 'Spices & Seasonings',
    spicesText: 'Svan salt — garlic, mountain herbs and spices including gitsruli. Megrelian adjika from Zugdidi — hot, though the heat is not the point so much as the layered aroma. Plus a spice gift box if you want to try several at once.',
    cards: 'Postcards',
    cardsText: 'Landscapes and city views from Svaneti to Adjara: Ushguli, the Alazani valley, Batumi, Gergeti against Kazbegi, old Tbilisi. Singly or as a set of five — the set is better value.',
    empty: 'No items in this section yet.',
    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'Can I take Georgian honey on a plane?',
        a: 'Aviation rules treat honey as a liquid, so a 300 g jar will not pass hand-luggage screening (100 ml per container). In checked baggage there is no limit. Check import rules at your destination — the EU restricts animal products from non-member countries.' },
      { q: 'How long does churchkhela keep?',
        a: 'Churchkhela is dried and keeps for months at room temperature in a dry place, as does pastila. These were designed as long-keeping foods — a way to preserve the grape and fruit harvest until the next season.' },
      { q: 'My honey crystallised — has it gone bad?',
        a: 'No. Crystallisation is natural for real honey and its speed depends on the nectar. Acacia stays liquid longest; chestnut and wildflower thicken sooner.' },
      { q: 'What should I pick as a gift if I do not know the person\u2019s taste?',
        a: 'A spice box or gift-packed tea suits almost anyone. Among honeys, acacia is the safest choice — mild and without bitterness. For something sweet, boxed Imeretian churchkhela travels best.' },
      { q: 'Do you deliver in Tbilisi?',
        a: 'Yes, within 2 hours. Delivery costs 10 ₾. We work daily from 09:00 to 21:00.' },
    ],
  },
  ka: {
    title: 'საჩუქრები საქართველოდან — თაფლი, ჩურჩხელა, ჩაი, სანელებლები | თბილისი | BAZARI ARA',
    description: 'გემრიელი სუვენირები საქართველოდან თბილისში მიწოდებით 2 საათში: თაფლი კახეთიდან და რაჭიდან, ჩურჩხელა და ტყლაპი, ქართული ჩაი, სვანური მარილი და აჯიკა, ღია ბარათები.',
    h1: 'საჩუქრები საქართველოდან',
    intro: 'მიემგზავრებით და არ იცით, რა წაიღოთ საქართველოდან? ყველაზე გულწრფელი სუვენირი ის არის, რომლის შეჭმაც შეიძლება. ჩვენ შევკრიბეთ პროდუქტები ქვეყნის სხვადასხვა კუთხიდან: თაფლი კახეთის, რაჭის, იმერეთის, ჯავახეთისა და ტორის საფუტკრეებიდან, ჩურჩხელა და ტყლაპი, ჩაი გურიიდან და აჭარიდან, სვანური მარილი და მეგრული აჯიკა.',
    intro2: 'თითოეული პროდუქტი კონკრეტულ რეგიონს უკავშირდება: რაჭული წაბლის თაფლი ისევე განსხვავდება იმერული აკაციის თაფლისგან, როგორც სიმინდის ფქვილზე დამზადებული იმერული ჩურჩხელა კახურისგან. მიწოდება თბილისში — 2 საათში.',
    honey: 'ქართული თაფლი',
    honeyText: 'ხუთი ჯიში ხუთი რეგიონიდან, თითოეული 300 გრამი. კახური ყვავილოვანი, ჯავახეთის კრემ-თაფლი, ტორის ფიჭვის, რაჭის წაბლის და იმერეთის აკაციის თაფლი.',
    sweets: 'ჩურჩხელა და ტყლაპი',
    sweetsText: 'კახური ჩურჩხელა ნიგვზით — მკვრივი, ხორბლის თათარაზე. იმერული თხილით — წვრილი, სიმინდის ფქვილზე, საჩუქრის ყუთში. ვაშლის, ქლიავისა და ტყემლის ტყლაპი.',
    tea: 'ქართული ჩაი',
    teaText: 'შავი ბროწეულით გურიიდან და მწვანე ჟასმინით აჭარიდან — ორივე საჩუქრის შეფუთვაში.',
    spices: 'სანელებლები',
    spicesText: 'სვანური მარილი — ნიორი, მთის ბალახები და სანელებლები, მათ შორის გიცრული. მეგრული აჯიკა ზუგდიდიდან. ასევე სანელებლების ნაკრები ყუთში.',
    cards: 'ღია ბარათები',
    cardsText: 'პეიზაჟები სვანეთიდან აჭარამდე: უშგული, ალაზნის ველი, ბათუმი, გერგეტი ყაზბეგის ფონზე, ძველი თბილისი. ცალობით ან 5 ცალის ნაკრებად.',
    empty: 'ამ განყოფილებაში ჯერ პროდუქტები არ არის.',
    faqTitle: 'ხშირად დასმული კითხვები',
    faq: [
      { q: 'შემიძლია თაფლის თვითმფრინავით წაღება?',
        a: 'საავიაციო წესებით თაფლი სითხეა, ამიტომ 300 გრ ქილა ხელბარგში არ გაივლის. ჩასაბარებელ ბარგში შეზღუდვა არ არის.' },
      { q: 'რამდენ ხანს ინახება ჩურჩხელა?',
        a: 'ჩურჩხელა გამომშრალია და ოთახის ტემპერატურაზე, მშრალ ადგილას თვეობით ინახება. იგივე ეხება ტყლაპს.' },
      { q: 'თაფლი დაკრისტალდა — გაფუჭდა?',
        a: 'არა. კრისტალიზაცია ნატურალური თაფლისთვის ბუნებრივი პროცესია. აკაციის თაფლი ყველაზე დიდხანს რჩება თხევადი.' },
      { q: 'რა ავირჩიო საჩუქრად?',
        a: 'სანელებლების ნაკრები ან ჩაი საჩუქრის შეფუთვაში თითქმის ყველას მოერგება. თაფლებიდან ყველაზე უნივერსალურია აკაციის.' },
      { q: 'მიგვაქვს თბილისში?',
        a: 'დიახ, 2 საათში. მიწოდების ღირებულება — 10 ₾. ვმუშაობთ ყოველდღე 09:00–21:00.' },
    ],
  },
} as const;

type Locale = keyof typeof COPY;

function getLocale(hdrs: Headers): Locale {
  const l = hdrs.get('x-locale');
  return l === 'en' || l === 'ka' ? l : 'ru';
}

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];
  const url = `https://bazariara.ge/${locale}${PATH}`;

  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: url,
      languages: {
        ru: `https://bazariara.ge/ru${PATH}`,
        en: `https://bazariara.ge/en${PATH}`,
        ka: `https://bazariara.ge/ka${PATH}`,
        'x-default': `https://bazariara.ge/ru${PATH}`,
      },
    },
    openGraph: {
      locale: locale === 'en' ? 'en_US' : locale === 'ka' ? 'ka_GE' : 'ru_GE',
      url,
      siteName: 'BAZARI ARA',
      type: 'website',
      title: c.title,
      description: c.description,
    },
  };
}

export const revalidate = 600;

export default async function GeorgianGiftsPage() {
  const hdrs = await headers();
  const locale = getLocale(hdrs);
  const c = COPY[locale];

  const [honey, sweets, tea, spices, cards] = await Promise.all([
    getProducts('med', 'all', '', 1),
    getProducts('churchhelaipastila', 'all', '', 1),
    getProducts('chay', 'all', '', 1),
    getProducts('spetsii', 'all', '', 1),
    getProducts('otkrytki', 'all', '', 1),
  ]);

  const url = `https://bazariara.ge/${locale}${PATH}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: c.h1,
      description: c.description,
      url,
      isPartOf: { '@type': 'WebSite', name: 'BAZARI ARA', url: 'https://bazariara.ge' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'BAZARI ARA', item: `https://bazariara.ge/${locale}` },
        { '@type': 'ListItem', position: 2, name: c.h1, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  const grid = (products: Awaited<ReturnType<typeof getProducts>>['products']) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} index={0} />
      ))}
    </div>
  );

  const section = (
    title: string,
    text: string,
    data: Awaited<ReturnType<typeof getProducts>>,
    categoryKey: string,
  ) => (
    <section className="mb-12">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
        <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
        <Link
          href={`/${locale}/?category=${categoryKey}`}
          className="text-lime-400 hover:text-lime-300 text-sm underline whitespace-nowrap"
        >
          {title} →
        </Link>
      </div>
      <p className="text-gray-300 leading-relaxed mb-5 max-w-3xl">{text}</p>
      {data.products.length === 0 ? (
        <p className="text-gray-500 text-sm">{c.empty}</p>
      ) : (
        grid(data.products)
      )}
    </section>
  );

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-5 text-gray-100">{c.h1}</h1>
        <p className="text-gray-300 leading-relaxed mb-4 max-w-3xl">{c.intro}</p>
        <p className="text-gray-300 leading-relaxed mb-10 max-w-3xl">{c.intro2}</p>

        {section(c.honey,  c.honeyText,  honey,  'med')}
        {section(c.sweets, c.sweetsText, sweets, 'churchhelaipastila')}
        {section(c.tea,    c.teaText,    tea,    'chay')}
        {section(c.spices, c.spicesText, spices, 'spetsii')}
        {section(c.cards,  c.cardsText,  cards,  'otkrytki')}

        <section className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-100 mb-5">{c.faqTitle}</h2>
          <div className="space-y-5">
            {c.faq.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold text-gray-100 mb-1.5">{f.q}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}