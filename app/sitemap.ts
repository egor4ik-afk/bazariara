import { MetadataRoute } from 'next';
import sql from '@/lib/db';

const SITE_URL = 'https://bazariara.ge';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productEntries: MetadataRoute.Sitemap = [];

  try {
    const rows = await sql`
      SELECT
        id,
        category_key,
        in_stock,
        updated_at
      FROM products
      WHERE source = 'gorgia'
        AND image_url IS NOT NULL
        AND category_key IS NOT NULL
    `;

    const categoryKeys = new Set<string>();

    for (const row of rows) {
      const categoryKey = row.category_key as string;
      const productId = row.id as number;

      // Страницы категорий (кроме "top" — это не настоящая категория)
      if (categoryKey && categoryKey !== 'top') {
        categoryKeys.add(categoryKey);
      }

      // Товары — только в наличии
      if (row.in_stock) {
        productEntries.push({
          url:             `${SITE_URL}/products/${categoryKey}/${productId}`,
          lastModified:    row.updated_at ? new Date(row.updated_at as string) : new Date(),
          changeFrequency: 'weekly',
          priority:        0.8,
        });
      }
    }

    // Страницы категорий
    for (const categoryKey of categoryKeys) {
      productEntries.push({
        url:             `${SITE_URL}/?category=${categoryKey}`,
        lastModified:    new Date(),
        changeFrequency: 'weekly',
        priority:        0.9,
      });
    }

  } catch (error) {
    console.error('Sitemap error:', error);
  }

  return [
    { url: SITE_URL,                      lastModified: new Date(), changeFrequency: 'daily',   priority: 1   },
    { url: `${SITE_URL}/privacy-policy`,  lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/returns`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    ...productEntries,
  ];
}