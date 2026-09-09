import { PrismaClient } from '@prisma/client';
import { MetadataRoute } from 'next';

const prisma = new PrismaClient();
const BASE_URL = 'https://bazari-ara.com';
const LOCALES = ['en', 'ru', 'ka'];

async function getProducts() {
  return await prisma.products.findMany({
    where: {
      in_stock: true,
      price: { not: null },
      name: { not: '' },
    },
    select: {
      id: true,
      category_key: true,
      updated_at: true,
    },
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  const productEntries: MetadataRoute.Sitemap = products.flatMap((product: { id: bigint; category_key: string | null; updated_at: Date; }) =>
    LOCALES.map(locale => ({
      url: `${BASE_URL}/${locale}/products/${product.category_key}/${product.id}`,
      lastModified: product.updated_at.toISOString(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
  );

  const staticPages = [
    { path: '', priority: 1.0 },
    { path: '/cart', priority: 0.5 },
    { path: '/checkout', priority: 0.4 },
    { path: '/gostintsy-iz-gruzii', priority: 0.9 },
    { path: '/powerbank-i-zaryadki', priority: 0.9 },
    { path: '/privacy-policy', priority: 0.3 },
    { path: '/farmers', priority: 0.7 },
    { path: '/farmers/chventan', priority: 0.6 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.flatMap(page =>
    LOCALES.map(locale => ({
      url: `${BASE_URL}/${locale}${page.path}`,
      lastModified: new Date().toISOString(),
      changeFrequency: page.path === '' ? 'daily' : 'weekly',
      priority: page.priority,
    }))
  );

  return [...staticEntries, ...productEntries];
}
