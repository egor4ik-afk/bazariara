'use server';

import sql from '@/lib/db';

interface OrderItem {
  product: {
    id: string;
    title: string;
    title_en?: string;
    price: number;
    category: string;
    categoryKey: string;
    image_url?: string;
  };
  quantity: number;
}

interface OrderDetails {
  customer: {
    name: string;
    phone?: string;
    social?: { [key: string]: string };
  };
  items: OrderItem[];
  total: number;
  shippingCost: number;
}

// ─── Telegram уведомление ─────────────────────────────────────────────────────
async function sendTelegramNotification(
  customer: OrderDetails['customer'],
  items: OrderItem[],
  total: number,
  shippingCost: number,
  createdAt: Date
): Promise<boolean> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы');
    return false;
  }

  const socialContacts = customer.social
    ? Object.entries(customer.social)
        .map(([p, v]) => `💬 ${p.charAt(0).toUpperCase() + p.slice(1)}: ${v}`)
        .join('\n')
    : '';

  const contactDetails = [
    customer.phone && `📞 Телефон: ${customer.phone}`,
    socialContacts,
  ].filter(Boolean).join('\n');

  const itemsList = items
    .map((item, i) => {
      const price = parseFloat(String(item.product.price));
      return `${i + 1}. ${item.product.title}\n   ${item.quantity} x ₾${price.toFixed(2)} = ₾${(price * item.quantity).toFixed(2)}`;
    })
    .join('\n\n');

  const subtotal     = total - shippingCost;
  const shippingText = shippingCost > 0
    ? `*🚚 Доставка: ₾${shippingCost.toFixed(2)}*`
    : '*🚚 Доставка: БЕСПЛАТНО*';

  const message = `
🛒 *НОВЫЙ ЗАКАЗ* 🛒

👤 *Клиент:* ${customer.name}
${contactDetails}

📦 *Состав заказа:*
${itemsList}

*Подытог: ₾${subtotal.toFixed(2)}*
${shippingText}
*💰 ИТОГО: ₾${total.toFixed(2)}*

📅 *Дата:* ${createdAt.toLocaleString('ru-RU', { timeZone: 'Asia/Tbilisi' })}
  `.trim();

  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    CHAT_ID,
          text:       message,
          parse_mode: 'Markdown',
        }),
      }
    );
    const data = await resp.json();
    if (!data.ok) {
      console.error('Telegram API Error:', data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Ошибка отправки в Telegram:', err);
    return false;
  }
}

// ─── Создание таблицы заказов (если не существует) ───────────────────────────
async function ensureOrdersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id           SERIAL PRIMARY KEY,
      customer     JSONB NOT NULL,
      items        JSONB NOT NULL,
      subtotal     NUMERIC(10,2),
      shipping     NUMERIC(10,2),
      total        NUMERIC(10,2),
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ─── Основная функция ─────────────────────────────────────────────────────────
export async function handlePlaceOrder(orderDetails: OrderDetails) {
  const { customer, items, total, shippingCost } = orderDetails;

  const hasSocial = customer.social && Object.keys(customer.social).length > 0;
  if (!customer?.name || (!customer.phone && !hasSocial)) {
    return { success: false, message: 'Необходимо указать имя и хотя бы один контакт.' };
  }
  if (!items?.length) {
    return { success: false, message: 'Ваша корзина пуста.' };
  }

  const createdAt = new Date();
  const subtotal  = total - shippingCost;

  try {
    await ensureOrdersTable();

    // Сохраняем заказ в Neon
    await sql`
      INSERT INTO orders (customer, items, subtotal, shipping, total, created_at)
      VALUES (
        ${JSON.stringify(customer)}::jsonb,
        ${JSON.stringify(items.map(item => ({
          id:          item.product.id,
          title:       item.product.title,
          price:       parseFloat(String(item.product.price)),
          quantity:    item.quantity,
          category:    item.product.category,
          categoryKey: item.product.categoryKey,
          image_url:   item.product.image_url ?? null,
        })))}::jsonb,
        ${subtotal},
        ${shippingCost},
        ${total},
        ${createdAt.toISOString()}
      )
    `;

    // Отправляем уведомление в Telegram
    await sendTelegramNotification(customer, items, total, shippingCost, createdAt);

    return { success: true };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Ошибка при оформлении заказа:', msg);
    return { success: false, message: `Ошибка сервера: ${msg}` };
  }
}