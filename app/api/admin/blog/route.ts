import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

/** CRUD статей плюс справочники для селекторов связей. */

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get('id');

  try {
    // Справочники для селекторов связей в редакторе.
    if (req.nextUrl.searchParams.get('refs')) {
      const [regions, producers, tags] = await Promise.all([
        sql`SELECT id, name FROM regions WHERE is_active ORDER BY sort_order`,
        sql`SELECT id, name FROM producers WHERE status = 'active' ORDER BY name`,
        sql`SELECT id, name FROM post_tags ORDER BY id`,
      ]);
      return NextResponse.json({ regions, producers, tags });
    }

    if (id) {
      const [post] = await sql`SELECT * FROM posts WHERE id = ${Number(id)}`;
      if (!post) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });

      const [regions, producers, products, tags] = await Promise.all([
        sql`SELECT region_id FROM post_regions WHERE post_id = ${Number(id)}`,
        sql`SELECT producer_id FROM post_producers WHERE post_id = ${Number(id)}`,
        sql`SELECT product_id FROM post_products WHERE post_id = ${Number(id)}`,
        sql`SELECT tag_id FROM post_tag_links WHERE post_id = ${Number(id)}`,
      ]);

      return NextResponse.json({
        post,
        links: {
          regions:   regions.map((r: any) => r.region_id),
          producers: producers.map((r: any) => r.producer_id),
          products:  products.map((r: any) => Number(r.product_id)),
          tags:      tags.map((r: any) => r.tag_id),
        },
      });
    }

    const [posts, regions, producers, tags] = await Promise.all([
      sql`
        SELECT id, slug, title, status, cover_url, published_at, updated_at
        FROM posts ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 200
      `,
      sql`SELECT id, name FROM regions WHERE is_active ORDER BY sort_order`,
      sql`SELECT id, name FROM producers ORDER BY name`,
      sql`SELECT id, name FROM post_tags ORDER BY id`,
    ]);

    return NextResponse.json({ posts, regions, producers, tags });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const body = await req.json();
  const slug = String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (!slug || !body.title) {
    return NextResponse.json({ error: 'slug и заголовок обязательны' }, { status: 400 });
  }

  try {
    // published_at ставится один раз, при первой публикации: если обновлять
    // его при каждом сохранении, статьи будут прыгать в начало ленты
    // после любой правки опечатки.
    const [post] = await sql`
      INSERT INTO posts (
        slug, title, title_en, title_ka,
        excerpt, excerpt_en, excerpt_ka,
        body, body_en, body_ka,
        cover_url, status, seo_title, seo_description, author_name,
        published_at
      ) VALUES (
        ${slug}, ${body.title}, ${body.title_en || null}, ${body.title_ka || null},
        ${body.excerpt || null}, ${body.excerpt_en || null}, ${body.excerpt_ka || null},
        ${body.body || ''}, ${body.body_en || null}, ${body.body_ka || null},
        ${body.cover_url || null}, ${body.status || 'draft'},
        ${body.seo_title || null}, ${body.seo_description || null},
        ${body.author_name || 'BAZARI ARA'},
        ${body.status === 'published' ? new Date().toISOString() : null}
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, title_en = EXCLUDED.title_en, title_ka = EXCLUDED.title_ka,
        excerpt = EXCLUDED.excerpt, excerpt_en = EXCLUDED.excerpt_en, excerpt_ka = EXCLUDED.excerpt_ka,
        body = EXCLUDED.body, body_en = EXCLUDED.body_en, body_ka = EXCLUDED.body_ka,
        cover_url = EXCLUDED.cover_url, status = EXCLUDED.status,
        seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
        author_name = EXCLUDED.author_name,
        published_at = COALESCE(posts.published_at, EXCLUDED.published_at),
        updated_at = NOW()
      RETURNING id, slug
    `;

    const postId = post.id as number;
    const links = body.links || {};

    // Перезаписываем связи целиком: набор маленький, а точечный diff дал бы
    // больше кода и больше шансов рассинхронизироваться.
    await sql`DELETE FROM post_regions   WHERE post_id = ${postId}`;
    await sql`DELETE FROM post_producers WHERE post_id = ${postId}`;
    await sql`DELETE FROM post_products  WHERE post_id = ${postId}`;
    await sql`DELETE FROM post_tag_links WHERE post_id = ${postId}`;

    for (const rid of links.regions || []) {
      await sql`INSERT INTO post_regions (post_id, region_id) VALUES (${postId}, ${Number(rid)}) ON CONFLICT DO NOTHING`;
    }
    for (const pid of links.producers || []) {
      await sql`INSERT INTO post_producers (post_id, producer_id) VALUES (${postId}, ${Number(pid)}) ON CONFLICT DO NOTHING`;
    }
    for (const pid of links.products || []) {
      await sql`INSERT INTO post_products (post_id, product_id) VALUES (${postId}, ${Number(pid)}) ON CONFLICT DO NOTHING`;
    }
    for (const tid of links.tags || []) {
      await sql`INSERT INTO post_tag_links (post_id, tag_id) VALUES (${postId}, ${Number(tid)}) ON CONFLICT DO NOTHING`;
    }

    return NextResponse.json({ ok: true, post });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });

  try {
    // Связи уходят каскадом — они объявлены с ON DELETE CASCADE.
    await sql`DELETE FROM posts WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
