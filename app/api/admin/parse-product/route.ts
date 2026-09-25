import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { aiChat } from '@/lib/ai';
import { googleTranslateBoth } from '@/lib/google-translate';

/**
 * Разбор товара из произвольного текста: сообщение фермера, пост,
 * заметка — «Ткемали 500 мл, 15 лари, натуральный соус из слив…».
 *
 * AI достаёт поля и выбирает категорию из СУЩЕСТВУЮЩИХ — список
 * передаётся в промпте, поэтому он не выдумает категорию, которой нет.
 * Переводы названия и описания делает Google.
 *
 * Ничего не сохраняет: результат попадает в форму, человек проверяет.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { text } = await req.json() as { text: string };
  const src = String(text || '').trim();
  if (src.length < 5) return NextResponse.json({ error: 'Слишком короткий текст' }, { status: 400 });
  if (src.length > 8000) return NextResponse.json({ error: 'Текст длиннее 8000 символов' }, { status: 413 });

  try {
    const cats = await sql`SELECT category_key, name FROM categories ORDER BY name`;
    const subs = await sql`SELECT category_key, name FROM subcategories ORDER BY name`;
    const producers = await sql`SELECT id, name FROM producers ORDER BY name`;

    const catList = cats.map((c: any) => {
      const s = subs.filter((x: any) => x.category_key === c.category_key).map((x: any) => x.name);
      return `- ${c.category_key}: ${c.name}${s.length ? ` (подкатегории: ${s.join(', ')})` : ''}`;
    }).join('\n');
    const prodList = producers.map((p: any) => `- ${p.id}: ${p.name}`).join('\n') || '(нет)';

    const system = [
      'Ты разбираешь описание товара для интернет-магазина BAZARI ARA (Тбилиси).',
      'Верни ТОЛЬКО JSON без Markdown и пояснений, строго такой формы:',
      '{"name_ru":"","price":null,"category_key":"","sub_category":"","producer_id":null,',
      '"sku":"","description_ru":"","in_stock":true}',
      '',
      'Правила:',
      '- name_ru: короткое название, как на витрине; объём/вес в конце через запятую ("Ткемали, 500 мл").',
      '- price: число в лари, без валюты. Если цены нет — null. Не выдумывай.',
      '- category_key: ТОЛЬКО ключ из списка ниже. Если ни одна не подходит — пустая строка.',
      '- sub_category: имя подкатегории ИЗ СПИСКА этой категории или пустая строка.',
      '- producer_id: id из списка производителей, только если он явно упомянут; иначе null.',
      '- description_ru: 60–140 слов по-русски, только факты из текста, без штампов и восклицаний.',
      '- in_stock: false, только если в тексте сказано, что товара нет или «скоро».',
      '',
      'Категории:', catList,
      '', 'Производители:', prodList,
    ].join('\n');

    const r = await aiChat({ system, user: src, temperature: 0.1, maxTokens: 6000 });

    const raw = r.text.replace(/```(?:json)?/g, '').trim();
    const jsonText = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    if (!jsonText) throw new Error('Модель не вернула JSON');
    const d = JSON.parse(jsonText);

    // Проверяем то, что модель могла перепутать: несуществующая категория,
    // чужая подкатегория, выдуманный производитель — обнуляем, а не
    // сохраняем мусор.
    const catOk = cats.some((c: any) => c.category_key === d.category_key);
    const subOk = catOk && subs.some((x: any) => x.category_key === d.category_key && x.name === d.sub_category);
    const prodOk = producers.some((p: any) => Number(p.id) === Number(d.producer_id));
    const price = typeof d.price === 'number' ? d.price : parseFloat(String(d.price ?? '').replace(',', '.'));

    const name = String(d.name_ru || '').trim();
    const desc = String(d.description_ru || '').trim();
    const [n, t] = await Promise.all([
      name ? googleTranslateBoth(name) : Promise.resolve({ en: '', ka: '' }),
      desc ? googleTranslateBoth(desc) : Promise.resolve({ en: '', ka: '' }),
    ]);

    return NextResponse.json({
      product: {
        name_ru: name, name_en: n.en, name_ka: n.ka,
        description_ru: desc, description_en: t.en, description_ka: t.ka,
        price: Number.isFinite(price) && price > 0 ? price : null,
        category_key: catOk ? d.category_key : '',
        sub_category: subOk ? d.sub_category : '',
        producer_id: prodOk ? Number(d.producer_id) : null,
        sku: String(d.sku || '').trim(),
        in_stock: d.in_stock !== false,
      },
      notes: [
        !catOk && d.category_key ? `AI предложил категорию «${d.category_key}», её нет — выберите вручную` : null,
        !catOk && !d.category_key ? 'Категорию определить не удалось — выберите вручную' : null,
        d.producer_id && !prodOk ? 'AI указал производителя, которого нет в базе — поле пустое' : null,
        !(Number.isFinite(price) && price > 0) ? 'Цены в тексте нет' : null,
      ].filter(Boolean),
      meta: { model: r.model, ms: r.ms },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}
