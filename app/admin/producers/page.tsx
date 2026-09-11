'use client';

import { useEffect, useState, useCallback } from 'react';

type Producer = {
  id: number; slug: string; name: string; name_en: string | null; name_ka: string | null;
  region_id: number | null; region_name: string | null; locality: string | null;
  description: string | null; image_url: string | null;
  website: string | null; instagram: string | null; facebook: string | null;
  status: string; seo_title: string | null; seo_description: string | null;
  sort_order: number; product_count: number;
};

type Application = {
  id: number; contact_name: string; brand_name: string; phone: string;
  region: string | null; products: string; social: string | null;
  description: string | null; status: string; admin_note: string | null;
  created_at: string;
};

type Region = { id: number; slug: string; name: string };

const box = { background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', padding: '8px 11px', fontSize: 13, outline: 'none', width: '100%' } as const;
const card = { background: '#1a1d28', border: '1px solid #2a2d3a', borderRadius: 12, padding: 16 } as const;

export default function ProducersAdmin() {
  const [tab, setTab] = useState<'producers' | 'applications'>('producers');
  const [producers, setProducers] = useState<Producer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [editing, setEditing] = useState<Partial<Producer> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, a, r] = await Promise.all([
      fetch('/api/admin/producers?what=producers').then((x) => x.json()),
      fetch('/api/admin/producers?what=applications').then((x) => x.json()),
      fetch('/api/admin/producers?what=regions').then((x) => x.json()),
    ]);
    setProducers(p.producers || []);
    setApplications(a.applications || []);
    setRegions(r.regions || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    const res = await fetch('/api/admin/producers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    const data = await res.json();
    setMsg(res.ok ? 'Сохранено' : `Ошибка: ${data.error}`);
    if (res.ok) { setEditing(null); load(); }
  };

  const act = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/producers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMsg(res.ok ? 'Готово' : `Ошибка: ${data.error}`);
    load();
  };

  const newCount = applications.filter((a) => a.status === 'new').length;

  return (
    <div style={{ padding: 24, color: '#fff', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Производители</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['producers', 'applications'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: '1px solid #2a2d3a', cursor: 'pointer',
              background: tab === k ? '#487B2C' : '#1a1d28',
              color: '#fff',
            }}
          >
            {k === 'producers' ? `Хозяйства (${producers.length})` : `Заявки${newCount ? ` (${newCount} новых)` : ''}`}
          </button>
        ))}
        {tab === 'producers' && (
          <button
            onClick={() => setEditing({ status: 'active', sort_order: 100 })}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                     border: 'none', background: '#5E9C3C', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
          >
            + Добавить
          </button>
        )}
      </div>

      {msg && <p style={{ color: '#A6CE8A', fontSize: 13, marginBottom: 12 }}>{msg}</p>}

      {/* ─────────── Редактор ─────────── */}
      {editing && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
            {editing.id ? `Правка: ${editing.name}` : 'Новое хозяйство'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <Field label="slug (URL)">
              <input style={box} value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="chventan" />
            </Field>
            <Field label="Название">
              <input style={box} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Название EN">
              <input style={box} value={editing.name_en || ''} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
            </Field>
            <Field label="Название KA">
              <input style={box} value={editing.name_ka || ''} onChange={(e) => setEditing({ ...editing, name_ka: e.target.value })} />
            </Field>
            <Field label="Регион">
              <select style={box} value={editing.region_id ?? ''} onChange={(e) => setEditing({ ...editing, region_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— не указан —</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Населённый пункт">
              <input style={box} value={editing.locality || ''} onChange={(e) => setEditing({ ...editing, locality: e.target.value })} />
            </Field>
            <Field label="Статус">
              <select style={box} value={editing.status || 'active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="active">Активен (виден на сайте)</option>
                <option value="hidden">Скрыт</option>
              </select>
            </Field>
            <Field label="Фото (URL)">
              <input style={box} value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
            </Field>
            <Field label="Сайт">
              <input style={box} value={editing.website || ''} onChange={(e) => setEditing({ ...editing, website: e.target.value })} />
            </Field>
            <Field label="Instagram">
              <input style={box} value={editing.instagram || ''} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} />
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field label="История хозяйства (абзацы разделяйте пустой строкой)">
              <textarea style={{ ...box, minHeight: 120, fontFamily: 'inherit' }}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#5E9C3C', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Сохранить
            </button>
            <button onClick={() => setEditing(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #2a2d3a', background: 'transparent', color: '#aaa', cursor: 'pointer' }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ─────────── Список хозяйств ─────────── */}
      {tab === 'producers' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {producers.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>
                  {p.name}
                  <span style={{ fontSize: 12, color: '#8b90a0', fontWeight: 400 }}> /{p.slug}</span>
                  {p.status !== 'active' && <span style={{ marginLeft: 8, fontSize: 11, color: '#C2703D' }}>скрыт</span>}
                </p>
                <p style={{ fontSize: 12, color: '#8b90a0' }}>
                  {[p.region_name, p.locality].filter(Boolean).join(', ') || 'регион не указан'} · товаров: {p.product_count}
                </p>
              </div>
              <a href={`/ru/farmers/${p.slug}`} target="_blank" rel="noreferrer"
                 style={{ fontSize: 12, color: '#A6CE8A' }}>открыть</a>
              <button onClick={() => setEditing(p)}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #2a2d3a', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                Править
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─────────── Заявки ─────────── */}
      {tab === 'applications' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {applications.length === 0 && <p style={{ color: '#8b90a0', fontSize: 13 }}>Заявок пока нет.</p>}
          {applications.map((a) => (
            <div key={a.id} style={{ ...card, opacity: a.status === 'new' ? 1 : 0.6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{a.brand_name}</p>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99,
                               background: a.status === 'new' ? '#487B2C' : '#2a2d3a' }}>
                  {a.status === 'new' ? 'новая' : a.status}
                </span>
                <span style={{ fontSize: 11, color: '#8b90a0', marginLeft: 'auto' }}>
                  {new Date(a.created_at).toLocaleString('ru-RU')}
                </span>
              </div>

              <p style={{ fontSize: 13, color: '#ccc', marginTop: 6 }}>
                {a.contact_name} · <a href={`tel:${a.phone}`} style={{ color: '#A6CE8A' }}>{a.phone}</a>
                {a.region && ` · ${a.region}`}
              </p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Производит: {a.products}</p>
              {a.social && <p style={{ fontSize: 12, color: '#8b90a0', marginTop: 4 }}>{a.social}</p>}
              {a.description && <p style={{ fontSize: 12, color: '#aaa', marginTop: 8, whiteSpace: 'pre-line' }}>{a.description}</p>}
              {a.admin_note && <p style={{ fontSize: 11, color: '#8b90a0', marginTop: 8 }}>{a.admin_note}</p>}

              {a.status === 'new' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => act({ action: 'application_to_producer', id: a.id })}
                    style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#5E9C3C', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Создать хозяйство (черновик)
                  </button>
                  <button
                    onClick={() => act({ action: 'application_status', id: a.id, status: 'rejected' })}
                    style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #2a2d3a', background: 'transparent', color: '#aaa', fontSize: 12, cursor: 'pointer' }}
                  >
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#8b90a0', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
