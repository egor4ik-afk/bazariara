import { Suspense } from 'react';
import sql from '@/lib/db';
import AdminDashboardClient from './DashboardClient';

export const revalidate = 0;

async function getStats() {
  const [totals, recentUpdates, priceRange, noPhoto, noSku] = await Promise.all([
    sql`SELECT
          COUNT(*)                                         AS total,
          COUNT(*) FILTER (WHERE in_stock = true)         AS in_stock,
          COUNT(*) FILTER (WHERE in_stock = false)        AS out_of_stock,
          COUNT(DISTINCT COALESCE(category, category_ka)) AS categories
        FROM products WHERE source = 'gorgia'`,
    sql`SELECT COUNT(*) AS updated_today
        FROM products
        WHERE source = 'gorgia' AND updated_at >= NOW() - INTERVAL '24 hours'`,
    sql`SELECT MIN(price) AS min, MAX(price) AS max, ROUND(AVG(price)::numeric,0) AS avg
        FROM products WHERE source='gorgia' AND price IS NOT NULL`,
    sql`SELECT COUNT(*) AS cnt FROM products WHERE source='gorgia' AND (image_url IS NULL OR image_url = '')`,
    sql`SELECT COUNT(*) AS cnt FROM products WHERE source='gorgia' AND (sku IS NULL OR sku = '')`,
  ]);

  return {
    total:        Number(totals[0].total),
    inStock:      Number(totals[0].in_stock),
    outOfStock:   Number(totals[0].out_of_stock),
    categories:   Number(totals[0].categories),
    updatedToday: Number(recentUpdates[0].updated_today),
    price:        { min: Number(priceRange[0].min), max: Number(priceRange[0].max), avg: Number(priceRange[0].avg) },
    noPhoto:      Number(noPhoto[0].cnt),
    noSku:        Number(noSku[0].cnt),
  };
}

async function getRecentActivity() {
  const rows = await sql`
    SELECT id, external_id, COALESCE(name_ru, name) AS name, price, in_stock, updated_at
    FROM products
    WHERE source = 'gorgia'
    ORDER BY updated_at DESC
    LIMIT 8
  `;
  return rows as { id: number; external_id: string; name: string; price: string; in_stock: boolean; updated_at: string }[];
}

export default async function AdminPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecentActivity()]);

  return <AdminDashboardClient stats={stats} recent={recent} />;
}
