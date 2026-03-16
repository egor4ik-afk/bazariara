import sql from '@/lib/db';
import ProductEditClient from './EditClient';
import { notFound } from 'next/navigation';

type Params = Promise<{ id: string }>;

export const revalidate = 0;

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;

  if (id === 'new') {
    return <ProductEditClient product={null} />;
  }

  const rows = await sql`
    SELECT * FROM products WHERE id = ${parseInt(id)} AND source = 'gorgia'
  `;

  if (!rows.length) notFound();

  const product = rows[0] as Record<string, unknown>;

  // ✅ ФИКС: postgres.js возвращает jsonb как строку — парсим вручную
  if (typeof product.images === 'string') {
    try {
      product.images = JSON.parse(product.images);
    } catch {
      product.images = [];
    }
  }

  // Если images пустой/null — пробуем взять из image_url
  if (!Array.isArray(product.images) || (product.images as string[]).length === 0) {
    product.images = product.image_url ? [product.image_url] : [];
  }

  return <ProductEditClient product={product} />;
}