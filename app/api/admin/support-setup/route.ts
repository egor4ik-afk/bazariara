import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { ensureSupportTables, supportConfig, tg } from '@/lib/support';

/**
 * Состояние чата поддержки: переменные, группа, темы, права бота, вебхук.
 *
 * Вебхук отсюда больше не ставится: его ставит панель relaxdev через свой
 * приёмник (hook.relaxweb.ru). Прямой адрес сайта Telegram доставлял хуже,
 * а установка отсюда перезаписывала вебхук приёмника.
 */

const RELAY_PREFIX = 'https://hook.relaxweb.ru/';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const cfg = supportConfig();
  const out: Record<string, any> = {
    env: {
      TELEGRAM_BOT_TOKEN: Boolean(cfg.token),
      TELEGRAM_SUPPORT_CHAT_ID: Boolean(cfg.chatId),
      TELEGRAM_WEBHOOK_SECRET: Boolean(cfg.secret),
    },
  };
  if (!cfg.token) return NextResponse.json(out);

  try {
    const me = await tg('getMe', {});
    out.bot = `@${me.username}`;
    const wh = await tg('getWebhookInfo', {});
    out.webhook = {
      url: wh.url || null,
      viaRelay: Boolean(wh.url?.startsWith(RELAY_PREFIX)),
      pending: wh.pending_update_count,
      lastError: wh.last_error_message || null,
    };

    if (cfg.chatId) {
      const chat = await tg('getChat', { chat_id: cfg.chatId });
      out.chat = { title: chat.title, isForum: Boolean(chat.is_forum) };
      const member = await tg('getChatMember', { chat_id: cfg.chatId, user_id: me.id });
      out.botRights = {
        admin: member.status === 'administrator' || member.status === 'creator',
        canManageTopics: Boolean(member.can_manage_topics),
      };
    }

    await ensureSupportTables();
    out.threads = await sql`
      SELECT t.id, t.visitor_name, t.contact, t.locale, t.status, t.last_at,
             (SELECT COUNT(*)::int FROM support_messages m WHERE m.thread_id = t.id) AS messages
      FROM support_threads t ORDER BY t.last_at DESC LIMIT 30
    `;
  } catch (e: any) {
    out.error = e?.message || String(e);
  }
  return NextResponse.json(out);
}
