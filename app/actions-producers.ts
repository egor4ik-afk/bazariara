'use server';

import sql from '@/lib/db';

export type ApplicationInput = {
  contactName: string;
  brandName: string;
  phone: string;
  region?: string;
  products: string;
  social?: string;
  description?: string;
  /** Honeypot: поле, скрытое от людей. Заполнено — значит бот. */
  website?: string;
};

/**
 * Заявка от производителя (ТЗ раздел 8).
 *
 * Ключевое требование: заявка НЕ создаёт опубликованного производителя.
 * Поток — форма → строка в producer_applications → ручная проверка в
 * админке → создание producers → добавление товаров. Поэтому запись идёт
 * в отдельную таблицу, а не в producers со статусом pending: так
 * непроверенная заявка физически не может протечь в выдачу через запрос,
 * где забыли фильтр по статусу.
 */
export async function submitApplication(
  input: ApplicationInput
): Promise<{ success: boolean; message?: string }> {
  // Honeypot. Отвечаем успехом, чтобы бот не подбирал обход.
  if (input.website) return { success: true };

  const contactName = (input.contactName || '').trim();
  const brandName   = (input.brandName   || '').trim();
  const phone       = (input.phone       || '').trim();
  const products    = (input.products    || '').trim();

  if (!contactName || !brandName || !phone || !products) {
    return { success: false, message: 'Заполните обязательные поля' };
  }

  // Телефон здесь проверяем мягко: это не заказ, а заявка, и отсечь
  // живого фермера из-за формата номера дороже, чем разобрать кривой.
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) {
    return { success: false, message: 'Проверьте номер телефона' };
  }

  const clip = (v: string | undefined, n: number) =>
    v ? String(v).trim().slice(0, n) || null : null;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS producer_applications (
        id           SERIAL PRIMARY KEY,
        contact_name text NOT NULL,
        brand_name   text NOT NULL,
        phone        text NOT NULL,
        region       text,
        products     text NOT NULL,
        social       text,
        description  text,
        status       text NOT NULL DEFAULT 'new',
        admin_note   text,
        created_at   timestamptz NOT NULL DEFAULT NOW()
      )
    `;

    // Защита от дублей: одна и та же пара «бренд + телефон» за сутки —
    // почти наверняка повторный клик, а не вторая заявка.
    const dup = await sql`
      SELECT id FROM producer_applications
      WHERE phone = ${phone} AND brand_name = ${brandName}
        AND created_at > NOW() - INTERVAL '1 day'
      LIMIT 1
    `;
    if (dup.length > 0) return { success: true };

    const [row] = await sql`
      INSERT INTO producer_applications
        (contact_name, brand_name, phone, region, products, social, description)
      VALUES (
        ${clip(contactName, 120)}, ${clip(brandName, 120)}, ${clip(phone, 30)},
        ${clip(input.region, 80)}, ${clip(products, 500)},
        ${clip(input.social, 200)}, ${clip(input.description, 2000)}
      )
      RETURNING id
    `;

    await notify(row.id as number, contactName, brandName, phone, input);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Ошибка заявки производителя:', msg);
    return { success: false, message: 'Не удалось отправить заявку. Напишите нам в WhatsApp.' };
  }
}

async function notify(
  id: number, contactName: string, brandName: string, phone: string, input: ApplicationInput
) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) return;

  const text = [
    `🌾 *ЗАЯВКА ОТ ПРОИЗВОДИТЕЛЯ №${id}*`,
    ``,
    `*${brandName}*`,
    `👤 ${contactName}`,
    `📞 ${phone}`,
    input.region ? `📍 ${input.region}` : null,
    ``,
    `Производит: ${input.products}`,
    input.social ? `🔗 ${input.social}` : null,
    input.description ? `\n_${input.description.slice(0, 500)}_` : null,
  ].filter(Boolean).join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error('Telegram error:', err);
  }
}
