import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

/**
 * Управление производителями и заявками.
 *
 * Заявка не превращается в производителя автоматически (ТЗ раздел 8):
 * действие approve только заводит черновик producers со status='hidden'
 * и помечает заявку обработанной. Публикует человек, вручную, после того
 * как убедится в данных.
 */

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const what = req.nextUrl.searchParams.get('what') || 'producers';

  try {
    if (what === 'applications') {
      const rows = await sql`
        SELECT * FROM producer_applications
        ORDER BY (status = 'new') DESC, created_at DESC
        LIMIT 200
      `;
      return NextResponse.json({ applications: rows });
    }

    if (what === 'products') {
      const pid = Number(req.nextUrl.searchParams.get('id'));
      const rows = await sql`
        SELECT id, sku, COALESCE(name_ru, name) AS name, price, in_stock, image_url, category_key
        FROM products WHERE producer_id = ${pid}
        ORDER BY in_stock DESC, id
      `;
      return NextResponse.json({ products: rows });
    }

    if (what === 'regions') {
      const rows = await sql`
        SELECT id, slug, name, name_en, name_ka, is_active, sort_order
        FROM regions ORDER BY sort_order
      `;
      return NextResponse.json({ regions: rows });
    }

    const rows = await sql`
      SELECT p.*, r.name AS region_name,
             (SELECT COUNT(*)::int FROM products x WHERE x.producer_id = p.id) AS product_count
      FROM producers p
      LEFT JOIN regions r ON r.id = p.region_id
      ORDER BY p.sort_order, p.name
    `;
    return NextResponse.json({ producers: rows });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const body = await req.json();
  const slug = String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (!slug || !body.name) {
    return NextResponse.json({ error: 'slug и name обязательны' }, { status: 400 });
  }

  // /farmers/join — статическая страница анкеты, она перекрывает
  // динамический /farmers/[slug]. Фермер с таким slug стал бы недоступен.
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: `slug «${slug}» зарезервирован, выберите другой` }, { status: 400 });
  }

  const v = {
    slug, name: body.name, name_en: body.name_en || null, name_ka: body.name_ka || null,
    region_id: body.region_id ? Number(body.region_id) : null,
    locality: body.locality || null, locality_en: body.locality_en || null, locality_ka: body.locality_ka || null,
    description: body.description || null, description_en: body.description_en || null,
    description_ka: body.description_ka || null, image_url: body.image_url || null,
    website: body.website || null, instagram: body.instagram || null, facebook: body.facebook || null,
    status: body.status || 'active',
    seo_title: body.seo_title || null, seo_title_en: body.seo_title_en || null, seo_title_ka: body.seo_title_ka || null,
    seo_description: body.seo_description || null, seo_description_en: body.seo_description_en || null,
    seo_description_ka: body.seo_description_ka || null,
    sort_order: body.sort_order ?? 100,
  };
  const editId = body.id ? Number(body.id) : null;

  try {
    const [clash] = await sql`
      SELECT id FROM producers WHERE slug = ${slug} ${editId ? sql`AND id <> ${editId}` : sql``} LIMIT 1
    `;
    if (clash) return NextResponse.json({ error: `Адрес «${slug}» уже занят другим хозяйством` }, { status: 409 });

    // Правка — UPDATE по id, создание — INSERT. Раньше было
    // INSERT ... ON CONFLICT (slug): смена адреса при правке создавала
    // второе хозяйство-дубль, а при сломанном автоинкременте падала даже
    // обычная правка текста.
    let row: any;
    if (editId) {
      [row] = await sql`
        UPDATE producers SET
          slug = ${v.slug}, name = ${v.name}, name_en = ${v.name_en}, name_ka = ${v.name_ka},
          region_id = ${v.region_id}, locality = ${v.locality}, locality_en = ${v.locality_en}, locality_ka = ${v.locality_ka},
          description = ${v.description}, description_en = ${v.description_en}, description_ka = ${v.description_ka},
          image_url = ${v.image_url}, website = ${v.website}, instagram = ${v.instagram}, facebook = ${v.facebook},
          status = ${v.status},
          seo_title = ${v.seo_title}, seo_title_en = ${v.seo_title_en}, seo_title_ka = ${v.seo_title_ka},
          seo_description = ${v.seo_description}, seo_description_en = ${v.seo_description_en},
          seo_description_ka = ${v.seo_description_ka},
          sort_order = ${v.sort_order}, updated_at = NOW()
        WHERE id = ${editId}
        RETURNING id, slug
      `;
      if (!row) return NextResponse.json({ error: `Хозяйство #${editId} не найдено` }, { status: 404 });
    } else {
      [row] = await sql`
        INSERT INTO producers (
          slug, name, name_en, name_ka, region_id, locality, locality_en, locality_ka,
          description, description_en, description_ka, image_url, website, instagram, facebook, status,
          seo_title, seo_title_en, seo_title_ka, seo_description, seo_description_en, seo_description_ka, sort_order
        ) VALUES (
          ${v.slug}, ${v.name}, ${v.name_en}, ${v.name_ka}, ${v.region_id}, ${v.locality}, ${v.locality_en}, ${v.locality_ka},
          ${v.description}, ${v.description_en}, ${v.description_ka}, ${v.image_url}, ${v.website}, ${v.instagram},
          ${v.facebook}, ${v.status}, ${v.seo_title}, ${v.seo_title_en}, ${v.seo_title_ka},
          ${v.seo_description}, ${v.seo_description_en}, ${v.seo_description_ka}, ${v.sort_order}
        )
        RETURNING id, slug
      `;
    }
    return NextResponse.json({ ok: true, producer: row });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const body = await req.json();
  const { action, id } = body;

  try {
    if (action === 'application_status') {
      await sql`
        UPDATE producer_applications
        SET status = ${body.status}, admin_note = ${body.admin_note || null}
        WHERE id = ${Number(id)}
      `;
      return NextResponse.json({ ok: true });
    }

    if (action === 'application_to_producer') {
      const [app] = await sql`SELECT * FROM producer_applications WHERE id = ${Number(id)}`;
      if (!app) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });

      // Транслитерация названия в slug. Кириллицу и грузинский пропускаем
      // через таблицу — иначе slug выйдет пустым.
      const slug = translit(String(app.brand_name));

      const [producer] = await sql`
        INSERT INTO producers (slug, name, locality, description, status)
        VALUES (
          ${slug}, ${app.brand_name}, ${app.region || null},
          ${app.description || null},
          'hidden'
        )
        ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
        RETURNING id, slug
      `;

      await sql`
        UPDATE producer_applications
        SET status = 'approved',
            admin_note = COALESCE(admin_note, '') || ' → producer #' || ${producer.id}
        WHERE id = ${Number(id)}
      `;

      // status = 'hidden' намеренно: заявка превращается в черновик,
      // а не в опубликованную страницу. Публикует человек после проверки.
      return NextResponse.json({ ok: true, producer });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

const RESERVED_SLUGS = new Set(['join', 'new', 'admin', 'api']);

const MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function translit(text: string): string {
  const base = text.toLowerCase().split('').map((ch) => MAP[ch] ?? ch).join('');
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `producer-${Date.now()}`;
}
