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
    // Языковые SEO-поля. Дешёвая страховка на случай, если код выкатили
    // раньше, чем запустили fix-blog-db.ts: без неё сохранение упало бы
    // на «column seo_title_en does not exist».
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title_en text`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title_ka text`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_description_en text`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_description_ka text`;

    // Адрес не должен совпадать с другой статьёй — проверяем явно,
    // а не надеемся на ON CONFLICT.
    const editId = body.id ? Number(body.id) : null;
    const [clash] = await sql`
      SELECT id FROM posts WHERE slug = ${slug} ${editId ? sql`AND id <> ${editId}` : sql``} LIMIT 1
    `;
    if (clash) {
      return NextResponse.json({ error: `Адрес «${slug}» уже занят другой статьёй` }, { status: 409 });
    }

    const f = {
      slug, title: body.title, title_en: body.title_en || null, title_ka: body.title_ka || null,
      excerpt: body.excerpt || null, excerpt_en: body.excerpt_en || null, excerpt_ka: body.excerpt_ka || null,
      body: body.body || '', body_en: body.body_en || null, body_ka: body.body_ka || null,
      cover_url: body.cover_url || null, status: body.status || 'draft',
      seo_title: body.seo_title || null, seo_description: body.seo_description || null,
      author_name: body.author_name || 'BAZARI ARA',
      seo_title_en: body.seo_title_en || null, seo_title_ka: body.seo_title_ka || null,
      seo_description_en: body.seo_description_en || null, seo_description_ka: body.seo_description_ka || null,
    };
    const publishedNow = f.status === 'published' ? new Date().toISOString() : null;

    /*
      Редактирование — UPDATE по id, создание — INSERT.

      Раньше и то и другое шло через INSERT ... ON CONFLICT (slug) DO UPDATE.
      Две беды:
      1. Postgres собирает вставляемую строку ЦЕЛИКОМ до проверки конфликта
         и падает на пустом id, если у таблицы нет автоинкремента, — даже
         когда в итоге просто обновил бы существующую запись.
      2. Запись искалась по адресу, а не по номеру. Поменял адрес при
         редактировании — конфликта нет, создаётся вторая статья-дубль.
    */
    let post: { id: number; slug: string } | undefined;
    if (editId) {
      [post] = await sql`
        UPDATE posts SET
          slug = ${f.slug}, title = ${f.title}, title_en = ${f.title_en}, title_ka = ${f.title_ka},
          excerpt = ${f.excerpt}, excerpt_en = ${f.excerpt_en}, excerpt_ka = ${f.excerpt_ka},
          body = ${f.body}, body_en = ${f.body_en}, body_ka = ${f.body_ka},
          cover_url = ${f.cover_url}, status = ${f.status},
          seo_title = ${f.seo_title}, seo_description = ${f.seo_description}, author_name = ${f.author_name},
          seo_title_en = ${f.seo_title_en}, seo_title_ka = ${f.seo_title_ka},
          seo_description_en = ${f.seo_description_en}, seo_description_ka = ${f.seo_description_ka},
          -- дата публикации ставится один раз: иначе статья прыгала бы
          -- в начало ленты после каждой правки опечатки
          published_at = COALESCE(published_at, ${publishedNow}),
          updated_at = NOW()
        WHERE id = ${editId}
        RETURNING id, slug
      ` as any;
      if (!post) return NextResponse.json({ error: `Статья #${editId} не найдена` }, { status: 404 });
    } else {
      [post] = await sql`
        INSERT INTO posts (
          slug, title, title_en, title_ka, excerpt, excerpt_en, excerpt_ka,
          body, body_en, body_ka, cover_url, status, seo_title, seo_description, author_name,
          seo_title_en, seo_title_ka, seo_description_en, seo_description_ka, published_at
        ) VALUES (
          ${f.slug}, ${f.title}, ${f.title_en}, ${f.title_ka}, ${f.excerpt}, ${f.excerpt_en}, ${f.excerpt_ka},
          ${f.body}, ${f.body_en}, ${f.body_ka}, ${f.cover_url}, ${f.status}, ${f.seo_title}, ${f.seo_description},
          ${f.author_name}, ${f.seo_title_en}, ${f.seo_title_ka}, ${f.seo_description_en}, ${f.seo_description_ka},
          ${publishedNow}
        )
        RETURNING id, slug
      ` as any;
    }

    const postId = post!.id as number;
    const links = body.links || {};

    // Связи — только разница: что убрали — удаляем, что добавили —
    // вставляем. Раньше на каждом сохранении связи удалялись и вставлялись
    // заново, то есть правка опечатки тоже писала в таблицы связей.
    const LINKS = [
      { key: 'regions',   table: 'post_regions',   col: 'region_id' },
      { key: 'producers', table: 'post_producers', col: 'producer_id' },
      { key: 'products',  table: 'post_products',  col: 'product_id' },
      { key: 'tags',      table: 'post_tag_links', col: 'tag_id' },
    ] as const;

    for (const L of LINKS) {
      const wanted = new Set<number>((links[L.key] || []).map(Number).filter(Number.isFinite));
      const rows = await sql.unsafe(`SELECT ${L.col} AS v FROM ${L.table} WHERE post_id = $1`, [postId]);
      const current = new Set<number>(rows.map((r: any) => Number(r.v)));

      const toDelete = [...current].filter((v) => !wanted.has(v));
      const toAdd = [...wanted].filter((v) => !current.has(v));

      if (toDelete.length) {
        await sql.unsafe(`DELETE FROM ${L.table} WHERE post_id = $1 AND ${L.col} = ANY($2)`, [postId, toDelete]);
      }
      for (const v of toAdd) {
        await sql.unsafe(
          `INSERT INTO ${L.table} (post_id, ${L.col}) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [postId, v]
        );
      }
    }

    return NextResponse.json({ ok: true, post });
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Раньше любая ошибка «null value in column id» объявлялась поломкой
    // posts — даже если падала другая таблица. Теперь называем ту,
    // о которой сообщил Postgres.
    if (e?.code === '23502' && e?.column_name === 'id') {
      return NextResponse.json({
        error: `В таблице ${e.table_name} нет автоинкремента id. Откройте /admin/db-health и нажмите «Починить».`,
      }, { status: 500 });
    }
    return NextResponse.json({ error: msg, table: e?.table_name }, { status: 500 });
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
