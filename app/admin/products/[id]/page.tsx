import sql from '@/lib/db';
import ProductEditClient from './EditClient';
import { notFound } from 'next/navigation';

type Params = Promise<{ id: string }>;

export const revalidate = 0;

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;

  // Support "new" for creating
  if (id === 'new') {
    return <ProductEditClient product={null} />;
  }

  const rows = await sql`
    SELECT * FROM products WHERE id = ${parseInt(id)} AND source = 'gorgia'
  `;

  if (!rows.length) notFound();

  return <ProductEditClient product={rows[0] as Record<string, unknown>} />;
}
