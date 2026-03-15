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
  customer: { name: string; phone?: string; social?: Record<string, string> };
  items: OrderItem[];
  total: number;
  shippingCost: number;
}

async function getProductLink(categoryKey: string, productId: string): Promise<string | null> {
  try {
    const rows = await sql`
      SELECT gorgia_url, source_url FROM products
      WHERE external_id = ${`${categoryKey}_${productId}`} AND source = 'gorgia'
      LIMIT 1
    `;
    return rows[0] ? ((rows[0].gorgia_url || rows[0].source_url) as string | null) : null;
  } catch { return null; }
}

async function sendTelegramNotification(
  customer: OrderDetails['customer'],
  items: (OrderItem & { link?: string | null })[],
  total: number,
  shippingCost: number,
  createdAt: Date
) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) return;

  const socialContacts = customer.social
    ? Object.entries(customer.social).map(([p, v]) => `💬 ${p}: ${v}`).join('\n')
    : '';

  const contactDetails = [
    customer.phone && `📞 ${customer.phone}`,
    socialContacts,
  ].filter(Boolean).join('\n');

  const itemsList = items.map((item, i) => {
    const price = parseFloat(String(item.product.price));
    const name  = item.link ? `[${item.product.title}](${item.link})` : item.product.title;
    return `${i + 1}. ${name}\n   ${item.quantity} x ₾${price.toFixed(2)} = ₾${(price * item.quantity).toFixed(2)}`;
  }).join('\n\n');

  const subtotal = total - shippingCost;
  const message = `🛒 *НОВЫЙ ЗАКАЗ*\n\n👤 *${customer.name}*\n${contactDetails}\n\n📦 *Заказ:*\n${itemsList}\n\nПодытог: ₾${subtotal.toFixed(2)}\n${shippingCost > 0 ? `Доставка: ₾${shippingCost.toFixed(2)}` : 'Доставка: БЕСПЛАТНО'}\n*💰 ИТОГО: ₾${total.toFixed(2)}*\n\n📅 ${createdAt.toLocaleString('ru-RU', { timeZone: 'Asia/Tbilisi' })}`.trim();

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
  } catch (err) { console.error('Telegram error:', err); }
}

export async function handlePlaceOrder(orderDetails: OrderDetails) {
  const { customer, items, total, shippingCost } = orderDetails;

  const hasSocial = customer.social && Object.keys(customer.social).length > 0;
  if (!customer?.name || (!customer.phone && !hasSocial))
    return { success: false, message: 'Необходимо указать имя и хотя бы один контакт.' };
  if (!items?.length)
    return { success: false, message: 'Ваша корзина пуста.' };

  const createdAt = new Date();
  const subtotal  = total - shippingCost;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY, customer JSONB NOT NULL, items JSONB NOT NULL,
        subtotal NUMERIC(10,2), shipping NUMERIC(10,2), total NUMERIC(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO orders (customer, items, subtotal, shipping, total, created_at)
      VALUES (
        ${JSON.stringify(customer)}::jsonb,
        ${JSON.stringify(items.map(i => ({
          id: i.product.id, title: i.product.title,
          price: parseFloat(String(i.product.price)),
          quantity: i.quantity, category: i.product.category,
          categoryKey: i.product.categoryKey, image_url: i.product.image_url ?? null,
        })))}::jsonb,
        ${subtotal}, ${shippingCost}, ${total}, ${createdAt.toISOString()}
      )
    `;

    const itemsWithLinks = await Promise.all(
      items.map(async item => ({
        ...item,
        link: await getProductLink(item.product.categoryKey, item.product.id),
      }))
    );

    await sendTelegramNotification(customer, itemsWithLinks, total, shippingCost, createdAt);
    return { success: true };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Ошибка заказа:', msg);
    return { success: false, message: `Ошибка сервера: ${msg}` };
  }
}