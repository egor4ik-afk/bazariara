import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const rows = await sql`
    SELECT
      category,
      sub_category,
      COUNT(*) AS cnt
    FROM products
    WHERE source = 'gorgia'
    GROUP BY category, sub_category
    ORDER BY category, sub_category
  `;

  return NextResponse.json({ categories: rows });
}
