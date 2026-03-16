import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

type Params = Promise<{ category: string; id: string }>

export async function GET(
  req: NextRequest,
  { params }: { params: Params }
) {
  const { category, id } = await params

  if (!id) {
    return NextResponse.json(
      { message: 'ID is required' },
      { status: 400 }
    )
  }

  const numericId = Number(id)

  if (!numericId) {
    return NextResponse.json(
      { message: 'Invalid ID' },
      { status: 400 }
    )
  }

  const lang = (req.nextUrl.searchParams.get('lang') || 'ru') as 'ru' | 'en' | 'ka'

  const nameField =
    lang === 'ka' ? sql`name_ka` :
    lang === 'en' ? sql`name_en` :
    sql`name_ru`

  const descField =
    lang === 'ka' ? sql`description_ka` :
    lang === 'en' ? sql`description_en` :
    sql`description_ru`

  try {
    const rows = await sql`
      SELECT
        id,
        external_id,
        source_url,
        gorgia_url,
        COALESCE(${nameField}, name) AS name,
        name_ru,
        name_en,
        name_ka,
        COALESCE(${descField}, description) AS description,
        description_ru,
        description_en,
        description_ka,
        price,
        currency,
        in_stock,
        availability,
        category,
        category_en,
        sub_category,
        sub_category_en,
        image_url,
        images
      FROM products
      WHERE source = 'gorgia'
        AND id = ${numericId}
      LIMIT 1
    `

    if (!rows.length) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        ...rows[0],
        categoryKey: category,
        title: rows[0].name,
        image_urls: (rows[0].images as string[])?.slice(1) || []
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
        }
      }
    )
  } catch (err) {
    console.error(`GET /api/products/${category}/${id}:`, err)

    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}