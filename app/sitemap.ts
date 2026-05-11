import { MetadataRoute } from 'next';
import sql from '@/lib/db';

const SITE_URL = 'https://bazariara.ge';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    // Один запрос — всё что нужно для сборки sitemap
    const rows = await sql`
      SELECT
        id,
        category_key,
        LOWER(REPLACE(COALESCE(sub_category, ''), ' ', '-')) AS sub_key,
        in_stock,
        updated_at
      FROM products
      WHERE source    = 'gorgia'
        AND image_url IS NOT NULL
        AND category_key IS NOT NULL
    `;

    const categoryDates   = new Map<string, Date>();   // category_key → max updated_at
    const subCategoryKeys = new Map<string, Set<string>>(); // category_key → Set<sub_key>

    for (const row of rows) {
      const catKey  = row.category_key as string;
      const subKey  = row.sub_key as string;
      const updated = row.updated_at ? new Date(row.updated_at as string) : new Date();

      if (!catKey || catKey === 'top') continue;

      // Обновляем max updated_at для категории
      const existing = categoryDates.get(catKey);
      if (!existing || updated > existing) {
        categoryDates.set(catKey, updated);
      }

      // Собираем подкатегории
      if (subKey) {
        if (!subCategoryKeys.has(catKey)) subCategoryKeys.set(catKey, new Set());
        subCategoryKeys.get(catKey)!.add(subKey);
      }

      // Товары — только в наличии
      if (row.in_stock) {
        entries.push({
          url:             `${SITE_URL}/products/${catKey}/${row.id}`,
          lastModified:    updated,
          changeFrequency: 'weekly',
          priority:        0.8,
        });
      }
    }

    // Страницы категорий
    for (const [catKey, lastMod] of categoryDates) {
      entries.push({
        url:             `${SITE_URL}/?category=${catKey}`,
        lastModified:    lastMod,   // ✅ реальная дата, не new Date()
        changeFrequency: 'weekly',
        priority:        0.9,
      });
    }

    // ✅ Страницы подкатегорий (раньше отсутствовали)
    for (const [catKey, subs] of subCategoryKeys) {
      const catDate = categoryDates.get(catKey) || new Date();
      for (const subKey of subs) {
        if (!subKey) continue;
        entries.push({
          url:             `${SITE_URL}/?category=${catKey}&subcategory=${subKey}`,
          lastModified:    catDate,
          changeFrequency: 'weekly',
          priority:        0.7,
        });
      }
    }

  } catch (error) {
    console.error('Sitemap error:', error);
  }

  return [
    {
      url:             SITE_URL,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1,
    },
    {
      url:             `${SITE_URL}/privacy-policy`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.3,
    },
    {
      url:             `${SITE_URL}/returns`,
      lastModified:    new Date(),
      changeFrequency: 'yearly',
      priority:        0.4,
    },
    ...entries,
  ];
}
