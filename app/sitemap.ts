import { MetadataRoute } from 'next';
import sql from '@/lib/db';

const URL = 'https://bazariara.ge';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productEntries: MetadataRoute.Sitemap = [];

  try {
    const rows = await sql`
      SELECT
        external_id,
        in_stock,
        updated_at
      FROM products
      WHERE source = 'gorgia'
        AND image_url IS NOT NULL
    `;

    const categoryKeys = new Set<string>();

    for (const row of rows) {
      const parts = (row.external_id as string).split('_');
      const categoryKey = parts[0];
      const productId   = parts.slice(1).join('_');

      // Категория
      if (categoryKey && categoryKey !== 'top') {
        categoryKeys.add(categoryKey);
      }

      // Товар — только in_stock
      if (row.in_stock && productId) {
        productEntries.push({
          url:             `${URL}/products/${categoryKey}/${productId}`,
          lastModified:    row.updated_at ? new Date(row.updated_at as string) : new Date(),
          changeFrequency: 'weekly',
          priority:        0.8,
        });
      }
    }

    // Страницы категорий
    for (const categoryKey of categoryKeys) {
      productEntries.push({
        url:             `${URL}/?category=${categoryKey}`,
        lastModified:    new Date(),
        changeFrequency: 'weekly',
        priority:        0.9,
      });
    }

  } catch (error) {
    console.error('Sitemap error:', error);
  }

  return [
    { url: URL,                      lastModified: new Date(), changeFrequency: 'monthly', priority: 1   },
    { url: `${URL}/privacy-policy`,  lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${URL}/returns`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    ...productEntries,
  ];
}