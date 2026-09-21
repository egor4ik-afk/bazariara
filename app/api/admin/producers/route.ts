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

  try {
    const [row] = await sql`
      INSERT INTO producers (
        slug, name, name_en, name_ka, region_id,
        locality, locality_en, locality_ka,
        description, description_en, description_ka,
        image_url, website, instagram, facebook, status,
        seo_title, seo_title_en, seo_title_ka,
        seo_description, seo_description_en, seo_description_ka,
        sort_order
      ) VALUES (
        ${slug}, ${body.name}, ${body.name_en || null}, ${body.name_ka || null},
        ${body.region_id ? Number(body.region_id) : null},
        ${body.locality || null}, ${body.locality_en || null}, ${body.locality_ka || null},
        ${body.description || null}, ${body.description_en || null}, ${body.description_ka || null},
        ${body.image_url || null}, ${body.website || null},
        ${body.instagram || null}, ${body.facebook || null}, ${body.status || 'active'},
        ${body.seo_title || null}, ${body.seo_title_en || null}, ${body.seo_title_ka || null},
        ${body.seo_description || null}, ${body.seo_description_en || null}, ${body.seo_description_ka || null},
        ${body.sort_order ?? 100}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, name_en = EXCLUDED.name_en, name_ka = EXCLUDED.name_ka,
        region_id = EXCLUDED.region_id,
        locality = EXCLUDED.locality, locality_en = EXCLUDED.locality_en, locality_ka = EXCLUDED.locality_ka,
        description = EXCLUDED.description,
        description_en = EXCLUDED.description_en, description_ka = EXCLUDED.description_ka,
        image_url = EXCLUDED.image_url, website = EXCLUDED.website,
        instagram = EXCLUDED.instagram, facebook = EXCLUDED.facebook,
        status = EXCLUDED.status,
        seo_title = EXCLUDED.seo_title, seo_title_en = EXCLUDED.seo_title_en, seo_title_ka = EXCLUDED.seo_title_ka,
        seo_description = EXCLUDED.seo_description,
        seo_description_en = EXCLUDED.seo_description_en, seo_description_ka = EXCLUDED.seo_description_ka,
        sort_order = EXCLUDED.sort_order, updated_at = NOW()
      RETURNING id, slug
    `;
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
