
import { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import sql from '@/lib/db';

const URL = 'https://bazariara.ge';

type SitemapProduct = {
  id: number;
  external_id: string;
  updated_at: Date;
  category_key: string | null;
};

// Re-implement with correct URL structure and data fetching
const getSitemapProducts = unstable_cache(
  async () => {
    const products = await sql<SitemapProduct[]>`
      SELECT id, external_id, updated_at, category_key
      FROM products
      WHERE 
        source = 'gorgia' 
        AND image_url IS NOT NULL 
        AND (external_id IS NOT NULL OR category_key IS NOT NULL)
    `;
    return products;
  },
  ['sitemap-products-v3'],
  { revalidate: 3600 }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getSitemapProducts();
  
  const productEntries = products
    .map(p => {
      // Use category_key from DB first, then fallback to parsing external_id
      const category = p.category_key || (p.external_id ? p.external_id.split('_')[0] : null);
      
      if (!category || !p.id) {
        return null;
      }

      return {
        url: `${URL}/products/${category}/${p.id}`,
        lastModified: p.updated_at,
        priority: 0.8,
        changeFrequency: 'weekly' as const,
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  // Add static pages and category pages
  const staticPages = [
    { url: URL, priority: 1.0, changeFrequency: 'daily' },
    { url: `${URL}/cart`, priority: 0.5, changeFrequency: 'monthly' },
    { url: `${URL}/orders`, priority: 0.5, changeFrequency: 'monthly' },
    { url: `${URL}/privacy-policy`, priority: 0.3, changeFrequency: 'yearly' },
    { url: `${URL}/returns`, priority: 0.3, changeFrequency: 'yearly' },
  ];

  const categoryUrls = [...new Set(productEntries.map(entry => {
      const parts = new URL(entry.url).pathname.split('/');
      return parts.slice(0, 3).join('/');
  }))].map(path => ({
      url: `${URL}${path}`,
      priority: 0.9,
      changeFrequency: 'daily' as const,
  }));


  return [
    ...staticPages,
    ...categoryUrls,
    ...productEntries,
  ];
}
