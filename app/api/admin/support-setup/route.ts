import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { ensureSupportTables, supportConfig, tg } from '@/lib/support';

/**
 * Настройка и состояние чата поддержки.
 *
 * GET  — что настроено и что нет: переменные, группа, темы, права бота, вебхук.
 * POST — установить вебхук. Если у бота уже стоит вебхук на ДРУГОЙ адрес,
 *        откажет: у бота может быть только один вебхук, и перезапись
 *        молча отключит его в другом проекте (например, в orders, если
 *        токен общий). Перезаписать можно только с { force: true }.
 */

const WEBHOOK_PATH = '/api/telegram/webhook';

function siteUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'bazariara.ge';
  return `https://${host}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const cfg = supportConfig();
  const out: Record<string, any> = {
    env: {
      TELEGRAM_BOT_TOKEN: Boolean(cfg.token),
      TELEGRAM_SUPPORT_CHAT_ID: Boolean(cfg.chatId),
    },
    expectedWebhook: siteUrl(req) + WEBHOOK_PATH,
  };
  if (!cfg.token) return NextResponse.json(out);

  try {
    const me = await tg('getMe', {});
    out.bot = `@${me.username}`;
    const wh = await tg('getWebhookInfo', {});
    out.webhook = { url: wh.url || null, pending: wh.pending_update_count, lastError: wh.last_error_message || null };

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

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  const cfg = supportConfig();
  if (!cfg.token) {
    return NextResponse.json({ error: 'Нужен TELEGRAM_BOT_TOKEN' }, { status: 400 });
  }
  const { force } = await req.json().catch(() => ({}));
  const url = siteUrl(req) + WEBHOOK_PATH;

  try {
    const wh = await tg('getWebhookInfo', {});
    if (wh.url && wh.url !== url && !force) {
      return NextResponse.json({
        error: `У бота уже стоит вебхук на ${wh.url}. Если это другой проект с тем же ботом, ` +
               'перезапись отключит его там. Лучше завести для поддержки отдельного бота.',
        existing: wh.url,
      }, { status: 409 });
    }
    await tg('setWebhook', {
      url, secret_token: cfg.secret, allowed_updates: ['message'], drop_pending_updates: true,
    });
    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}
