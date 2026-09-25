'use client';

import { useEffect, useState } from 'react';

type Row = { table: string; type: string; default: string | null; identity: boolean; ok: boolean };

/**
 * /admin/db-health — проверка автоинкремента id через ту же базу,
 * с которой работает сайт. Одна кнопка чинит всё найденное.
 */
export default function DbHealth() {
  const [data, setData] = useState<{ where?: { host: string; database: string }; tables?: Row[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetch('/api/admin/db-health');
    const d = await r.json();
    if (!r.ok) setMsg(d.error || `HTTP ${r.status}`); else setData(d);
  };
  useEffect(() => { load(); }, []);

  const fix = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch('/api/admin/db-health', { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setMsg(`Ошибка: ${d.error}`); return; }
    setMsg(d.fixed.length ? `Исправлено: ${d.fixed.join(', ')}` : 'Чинить нечего — всё в порядке');
    setData((prev) => ({ ...prev, tables: d.tables }));
  };

  const broken = (data?.tables || []).filter((t) => !t.ok);

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto', color: 'rgb(var(--ink-900))' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Проверка базы</h1>
      <p style={{ fontSize: 13, color: 'rgb(var(--ink-500))', marginBottom: 16 }}>
        Автоинкремент id во всех таблицах — через то же подключение, что у сайта.
      </p>

      {data?.where && (
        <p style={{ fontSize: 13, padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                    background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))' }}>
          🔌 Сайт подключён к базе <b>{data.where.database}</b> на <b>{data.where.host}</b>.
          <br />
          <span style={{ color: 'rgb(var(--ink-500))' }}>
            Если скрипт в терминале показывает другой хост — у вас в .env и на Vercel разные базы.
          </span>
        </p>
      )}

      {msg && <p style={{ fontSize: 13, marginBottom: 12, color: 'rgb(var(--brand-600))' }}>{msg}</p>}

      {broken.length > 0 && (
        <button onClick={fix} disabled={busy}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 16,
                   background: 'rgb(var(--brand-600))', color: 'rgb(var(--on-brand))', fontWeight: 700 }}>
          {busy ? 'Чиним…' : `🔧 Починить (${broken.length})`}
        </button>
      )}

      <div style={{ display: 'grid', gap: 4 }}>
        {(data?.tables || []).map((t) => (
          <div key={t.table} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '6px 10px', borderRadius: 8,
                                       background: t.ok ? 'transparent' : 'rgb(var(--clay) / .1)' }}>
            <span>{t.ok ? '✓' : '✗'}</span>
            <span style={{ flexGrow: 1, fontFamily: 'ui-monospace, monospace' }}>{t.table}</span>
            <span style={{ color: t.ok ? 'rgb(var(--ink-500))' : 'rgb(var(--clay))' }}>
              {t.identity ? 'identity' : t.default ? 'serial' : 'нет автоинкремента'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
