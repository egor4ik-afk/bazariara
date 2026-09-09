import { MetadataRoute } from 'next';
import sql from '@/lib/db';

const SITE_URL = 'https://bazariara.ge';
const LOCALES = ['ru', 'en', 'ka'] as const;

/**
 * Next.js не экранирует спецсимволы в URL при генерации sitemap.xml —
 * известный баг: https://github.com/vercel/next.js/issues/77340
 * Наши URL с ?category=X&subcategory=Y содержат "&", который ломает XML.
 * Экранируем вручную все значения, идущие в <loc> и <xhtml:link href>.
 */
function escapeXml(url: string): string {
  return url
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Строит по одному sitemap-entry на каждую локаль, все со ссылками друг на друга (hreflang). */
function localizedEntries(
  path: string, // начинается с '/', БЕЗ префикса локали
  lastModified: Date,
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>,
  priority: number,
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = escapeXml(`${SITE_URL}/${l}${path}`);
  languages['x-default'] = escapeXml(`${SITE_URL}/ru${path}`);

  return LOCALES.map((l) => ({
    url: escapeXml(`${SITE_URL}/${l}${path}`),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
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

    const categoryDates   = new Map<string, Date>();
    const subCategoryKeys = new Map<string, Set<string>>();

    for (const row of rows) {
      const catKey  = row.category_key as string;
      const subKey  = row.sub_key as string;
      const updated = row.updated_at ? new Date(row.updated_at as string) : new Date();

      if (!catKey) continue;

      const existing = categoryDates.get(catKey);
      if (!existing || updated > existing) categoryDates.set(catKey, updated);

      if (subKey) {
        if (!subCategoryKeys.has(catKey)) subCategoryKeys.set(catKey, new Set());
        subCategoryKeys.get(catKey)!.add(subKey);
      }

      if (row.in_stock) {
        entries.push(...localizedEntries(`/products/${catKey}/${row.id}`, updated, 'weekly', 0.8));
      }
    }

    for (const [catKey, lastMod] of categoryDates) {
      entries.push(...localizedEntries(`/?category=${catKey}`, lastMod, 'weekly', 0.9));
    }

    for (const [catKey, subs] of subCategoryKeys) {
      const catDate = categoryDates.get(catKey) || new Date();
      for (const subKey of subs) {
        if (!subKey) continue;
        // ВАЖНО: тут раньше и был "сырой" & без экранирования — источник бага.
        entries.push(...localizedEntries(`/?category=${catKey}&subcategory=${subKey}`, catDate, 'weekly', 0.7));
      }
    }
  } catch (error) {
    console.error('Sitemap error:', error);
  }

  return [
    ...localizedEntries('/', new Date(), 'daily', 1),
    ...localizedEntries('/privacy-policy', new Date(), 'yearly', 0.3),
    ...localizedEntries('/returns', new Date(), 'yearly', 0.4),
    ...localizedEntries('/turisticheskoe-snaryazhenie', new Date(), 'monthly', 0.6),
    ...localizedEntries('/powerbank-i-zaryadki', new Date(), 'monthly', 0.6),
    ...localizedEntries('/gostintsy-iz-gruzii', new Date(), 'weekly', 0.9),
    ...entries,
  ];
}
