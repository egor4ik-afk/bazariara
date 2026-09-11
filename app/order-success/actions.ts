'use server';

import sql from '@/lib/db';

/**
 * Источники, из которых пришёл клиент.
 *
 * Список закрытый и хранится здесь, а не свободным текстом: иначе в отчёте
 * получится «инстаграм», «Instagram», «инста» и «insta» как четыре разных
 * канала, и посчитать что-либо будет нельзя. Свободный ввод оставлен только
 * для варианта «другое» — и он пишется в отдельную колонку.
 */
export const REFERRAL_SOURCES = [
  'instagram',
  'facebook',
  'google',
  'friend',
  'telegram',
  'passing_by',
  'other',
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export async function saveOrderSource(
  orderId: number,
  source: string,
  comment?: string
): Promise<{ success: boolean; message?: string }> {
  if (!orderId || !Number.isFinite(orderId)) {
    return { success: false, message: 'Некорректный номер заказа' };
  }

  if (!REFERRAL_SOURCES.includes(source as ReferralSource)) {
    return { success: false, message: 'Неизвестный источник' };
  }

  // Комментарий пишем только для «другое» и режем длину: поле открытое,
  // а значит может прилететь что угодно.
  const trimmed =
    source === 'other' && comment ? String(comment).trim().slice(0, 300) : null;

  try {
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_source text`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_comment text`;

    // Отвечать можно только один раз: если источник уже записан, повторный
    // запрос ничего не меняет. Иначе достаточно обновить страницу «спасибо»,
    // чтобы накрутить статистику.
    const updated = await sql`
      UPDATE orders
      SET referral_source = ${source},
          referral_comment = ${trimmed}
      WHERE id = ${orderId}
        AND referral_source IS NULL
      RETURNING id
    `;

    if (updated.length === 0) {
      return { success: true };   // ответ уже был — для клиента это не ошибка
    }

    await notifyTelegram(orderId, source, trimmed);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Ошибка сохранения источника заказа:', msg);
    return { success: false, message: msg };
  }
}

const LABELS: Record<string, string> = {
  instagram:   'Instagram',
  facebook:    'Facebook',
  google:      'Поиск Google',
  friend:      'Посоветовали знакомые',
  telegram:    'Telegram',
  passing_by:  'Проходил мимо / увидел вывеску',
  other:       'Другое',
};

async function notifyTelegram(orderId: number, source: string, comment: string | null) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) return;

  const text = [
    `📊 Заказ №${orderId} — откуда узнали:`,
    `*${LABELS[source] || source}*`,
    comment ? `_${comment}_` : null,
  ].filter(Boolean).join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error('Telegram error:', err);
  }
}
