'use client';

import { useEffect, useState } from 'react';

type Status = {
  env: Record<string, boolean>;
  expectedWebhook: string;
  bot?: string;
  webhook?: { url: string | null; pending: number; lastError: string | null };
  chat?: { title: string; isForum: boolean };
  botRights?: { admin: boolean; canManageTopics: boolean };
  threads?: { id: number; visitor_name: string | null; contact: string | null; locale: string;
              status: string; last_at: string; messages: number }[];
  error?: string;
};

const row = (ok: boolean | undefined, label: string, hint?: string) => (
  <div style={{ display: 'flex', gap: 10, fontSize: 13, padding: '5px 0' }}>
    <span style={{ width: 18 }}>{ok ? '✓' : '✗'}</span>
    <span style={{ flexGrow: 1 }}>
      {label}
      {!ok && hint && <span style={{ display: 'block', fontSize: 12, color: 'rgb(var(--clay))' }}>{hint}</span>}
    </span>
  </div>
);

export default function SupportAdmin() {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetch('/api/admin/support-setup');
    setS(await r.json());
  };
  useEffect(() => { load(); }, []);

  const install = async (force = false) => {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/admin/support-setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.status === 409) {
      if (confirm(`${d.error}\n\nВсё равно перезаписать?`)) return install(true);
      return;
    }
    setMsg(r.ok ? `Вебхук установлен: ${d.url}` : `Ошибка: ${d.error}`);
    load();
  };

  if (!s) return <p style={{ padding: 24 }}>Загрузка…</p>;

  const webhookOk = s.webhook?.url === s.expectedWebhook;
  const allOk = s.env.TELEGRAM_SUPPORT_BOT_TOKEN && s.env.TELEGRAM_SUPPORT_CHAT_ID
    && s.chat?.isForum && s.botRights?.canManageTopics && webhookOk;

  const card = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))', borderRadius: 12, padding: 18, marginBottom: 16 } as const;

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto', color: 'rgb(var(--ink-900))' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Чат поддержки</h1>
      <p style={{ fontSize: 13, color: 'rgb(var(--ink-500))', marginBottom: 16 }}>
        {allOk ? '✅ Всё настроено — чат на сайте работает.' : 'Пройдите пункты по порядку.'}
      </p>

      <div style={card}>
        {row(s.env.TELEGRAM_SUPPORT_BOT_TOKEN, 'TELEGRAM_SUPPORT_BOT_TOKEN',
             'Отдельный бот только для поддержки — создайте в @BotFather. Не бот заказов и не бот другого проекта')}
        {row(s.env.TELEGRAM_SUPPORT_CHAT_ID, 'TELEGRAM_SUPPORT_CHAT_ID',
             'ID группы поддержки (начинается с -100). Отдельная группа, не чат заказов')}
        {s.bot && row(true, `Бот: ${s.bot}`)}
        {s.chat && row(s.chat.isForum, `Группа «${s.chat.title}» с темами`,
             'Настройки группы → Темы → включить')}
        {s.botRights && row(s.botRights.canManageTopics, 'Бот — админ с правом «Управление темами»',
             'Назначьте бота администратором группы и дайте право управлять темами')}
        {row(webhookOk, `Вебхук: ${s.webhook?.url || 'не установлен'}`,
             s.webhook?.url ? `Должен быть ${s.expectedWebhook}` : 'Нажмите кнопку ниже')}
        {s.webhook?.lastError && (
          <p style={{ fontSize: 12, color: 'rgb(var(--clay))', marginTop: 6 }}>
            Последняя ошибка доставки: {s.webhook.lastError}
          </p>
        )}
        {s.error && <p style={{ fontSize: 12, color: 'rgb(var(--clay))', marginTop: 6 }}>{s.error}</p>}

        <button onClick={() => install()} disabled={busy || !s.env.TELEGRAM_SUPPORT_BOT_TOKEN}
          style={{ marginTop: 12, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                   background: 'rgb(var(--brand-600))', color: 'rgb(var(--on-brand))', fontWeight: 700 }}>
          {busy ? 'Устанавливаем…' : webhookOk ? 'Переустановить вебхук' : 'Установить вебхук'}
        </button>
        {msg && <p style={{ fontSize: 13, marginTop: 8, color: 'rgb(var(--brand-600))' }}>{msg}</p>}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '20px 0 8px' }}>Последние разговоры</h2>
      {!s.threads?.length ? (
        <p style={{ fontSize: 13, color: 'rgb(var(--ink-500))' }}>Пока ни одного.</p>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {s.threads.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '7px 10px',
                                     borderRadius: 8, border: '1px solid rgb(var(--ink-200))' }}>
              <b>#{t.id}</b>
              <span style={{ flexGrow: 1 }}>{t.visitor_name || 'Гость'}{t.contact ? ` · ${t.contact}` : ''}</span>
              <span style={{ color: 'rgb(var(--ink-500))' }}>
                {t.locale} · {t.messages} сообщ. · {t.status === 'closed' ? 'закрыт' : 'открыт'} ·{' '}
                {new Date(t.last_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: 'rgb(var(--ink-500))', marginTop: 10 }}>
        Отвечать — в Telegram, в теме разговора. Команда /close в теме завершает разговор.
      </p>
    </div>
  );
}
