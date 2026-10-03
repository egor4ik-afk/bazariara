export type Lang = 'ru' | 'en' | 'ka';

// Тип категории — точно соответствует InteractiveFilters + CategoryCarousel
export type Category = {
  key: string;
  name: string;
  name_en: string | null;
  name_ka: string | null;
  imageUrl: string;
};

export interface Product {
  id: number;
  external_id: string;
  source: string;
  source_url: string | null;
  gorgia_url: string | null;

  // Основное поле (ru → en → ka)
  name: string;
  name_ru: string | null;
  name_en: string | null;
  name_ka: string | null;

  // Обратная совместимость — QuantityInput и другие компоненты используют title/categoryKey
  title?: string;
  title_en?: string;
  title_ka?: string;
  categoryKey?: string;

  description: string | null;
  description_ru: string | null;
  description_en: string | null;
  description_ka: string | null;

  price: number | null;
  currency: string;
  in_stock: boolean;
  availability: string | null;

  category: string | null;
  category_en: string | null;
  category_ka: string | null;
  
  sub_category: string | null;
  sub_category_en: string | null;
  farmer_slug?: string | null;
  farmer_name?: string | null;
  sub_category_ka: string | null;

  // Главное фото
  image_url: string | null;
  // Все фото включая главное
  images: string[];

  created_at: string;
  updated_at: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Хелперы локализации
export function getName(p: Product, lang: Lang = 'ru'): string {
  if (lang === 'ru') return p.name_ru || p.name_en || p.name_ka || p.name;
  if (lang === 'en') return p.name_en || p.name_ru || p.name_ka || p.name;
  return p.name_ka || p.name;
}

export function getDescription(p: Product, lang: Lang = 'ru'): string | null {
  if (lang === 'ru') return p.description_ru || p.description_en || p.description_ka;
  if (lang === 'en') return p.description_en || p.description_ru || p.description_ka;
  return p.description_ka;
}

export function getCategory(p: Product, lang: Lang = 'ru'): string {
  if (lang === 'en') return p.category_en || p.category || '';
  return p.category || '';
}

export function getSubCategory(p: Product, lang: Lang = 'ru'): string {
  if (lang === 'en') return p.sub_category_en || p.sub_category || '';
  return p.sub_category || '';
}

export function getAllImages(p: Product): string[] {
  let imgs = p.images;

  // Neon возвращает JSONB как строку — парсим
  if (typeof imgs === 'string') {
    try { imgs = JSON.parse(imgs); } catch { imgs = []; }
  }

  if (Array.isArray(imgs) && imgs.length > 0) return imgs;
  if (p.image_url) return [p.image_url];
  return [];
}

/**
 * Товар для карточки каталога: только то, что карточка показывает и кладёт в корзину.
 * Раньше в клиентскую карточку уходил весь объект — три полных описания, source_url,
 * даты, — и Next.js вписывал его в HTML для каждой карточки: 4–5 КБ на товар,
 * ~250 КБ на главной. Описания в корзине не показываются, хватает начала.
 */
export function toCardProduct(p: any): Product {
  const cut = (s: string | null | undefined) =>
    s && s.length > 160 ? s.slice(0, 160).trimEnd() + '…' : (s ?? null);
  return {
    id: p.id,
    external_id: p.external_id,
    category_key: p.category_key,
    name: p.name,
    name_ru: p.name_ru ?? null,
    name_en: p.name_en ?? null,
    name_ka: p.name_ka ?? null,
    description: cut(p.description),
    description_ru: cut(p.description_ru),
    description_en: cut(p.description_en),
    description_ka: cut(p.description_ka),
    price: p.price ?? null,
    currency: p.currency,
    in_stock: p.in_stock,
    category: p.category ?? null,
    category_en: p.category_en ?? null,
    category_ka: p.category_ka ?? null,
    sub_category: p.sub_category ?? null,
    sub_category_en: p.sub_category_en ?? null,
    sub_category_ka: p.sub_category_ka ?? null,
    farmer_slug: p.farmer_slug ?? null,
    farmer_name: p.farmer_name ?? null,
    image_url: p.image_url ?? null,
    images: getAllImages(p),
  } as Product;
}
