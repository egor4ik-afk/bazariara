import { MetadataRoute } from 'next';
import { database } from '@/lib/firebase/server';

const URL = 'https://bazariara.ge';

type Product = {
  id: string;
  categoryKey: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productsRef = database.ref('products');
  const productEntries: MetadataRoute.Sitemap = [];

  try {
    const snapshot = await productsRef.once('value');
    if (snapshot.exists()) {
      const categories = snapshot.val();
      Object.keys(categories).forEach(categoryKey => {
        // Добавляем саму категорию в sitemap
        if (categoryKey !== 'top') { // 'top' можно исключить, если это не самостоятельная SEO-страница
            productEntries.push({
            url: `${URL}/?category=${categoryKey}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9, // Высокий приоритет для посадочной страницы
            });
        }

        const productsInCategory = categories[categoryKey];
        if (productsInCategory && typeof productsInCategory === 'object') {
            Object.keys(productsInCategory).forEach(productId => {
                const product = productsInCategory[productId];
                if (product && product.in_stock) {
                    productEntries.push({
                        url: `${URL}/products/${categoryKey}/${productId}`,
                        lastModified: new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.8,
                    });
                }
            });
        }
      });
    } else {
      console.log("No products found for sitemap.");
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  return [
    {
      url: URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
        url: `${URL}/privacy-policy`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.3,
    },
    {
        url: `${URL}/returns`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.4,
    },
    ...productEntries,
  ];
}
