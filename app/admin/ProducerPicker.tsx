'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type ProducerOption = {
  id: number;
  slug: string;
  name: string;
  region_name: string | null;
  status: string;
};

/**
 * Выбор фермера для товара (ТЗ v1.0, раздел 4.1).
 *
 * Раньше здесь был <select> по массиву FARMERS, зашитому в код одной
 * строкой: новый фермер из админки в список не попадал, пока кто-то
 * не поправит файл и не передеплоит. Теперь список грузится из БД.
 *
 * Поиск по названию — потому что при двадцати хозяйствах <select>
 * превращается в пролистывание. Привязку можно снять крестиком.
 */
export default function ProducerPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null, producer: ProducerOption | null) => void;
}) {
  const [list, setList] = useState<ProducerOption[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/producers?what=producers')
      .then((r) => r.json())
      .then((d) => setList(d.producers || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selected = list.find((p) => p.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.region_name || '').toLowerCase().includes(q)
    );
  }, [list, query]);

  const field = {
    width: '100%', padding: '9px 12px', background: 'rgb(var(--cream-200))',
    border: '1px solid rgb(var(--ink-200))', borderRadius: 8,
    color: 'rgb(var(--ink-900))', fontSize: 13, outline: 'none',
  } as const;

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      {selected ? (
        <div style={{ ...field, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flexGrow: 1 }}>
            <b>{selected.name}</b>
            <span style={{ color: 'rgb(var(--ink-500))', fontSize: 12 }}>
              {selected.region_name ? ` · ${selected.region_name}` : ''}
              {selected.status !== 'active' ? ' · скрыт' : ''}
            </span>
          </span>
          <button
            type="button"
            onClick={() => { setOpen(true); setQuery(''); }}
            style={{ background: 'none', border: 'none', color: 'rgb(var(--brand-600))',
                     fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            Сменить
          </button>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            title="Убрать привязку"
            style={{ background: 'none', border: 'none', color: 'rgb(var(--clay))',
                     fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ) : (
        <input
          style={field}
          value={query}
          placeholder={loading ? 'Загружаем список…' : 'Начните вводить название фермера'}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        />
      )}

      {open && (
        <div style={{
          position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4,
          maxHeight: 260, overflowY: 'auto', borderRadius: 8,
          background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))',
          boxShadow: '0 8px 24px rgb(var(--shadow-rgb) / .15)',
        }}>
          {selected && (
            <input
              autoFocus
              style={{ ...field, border: 'none', borderBottom: '1px solid rgb(var(--ink-200))', borderRadius: 0 }}
              value={query}
              placeholder="Поиск…"
              onChange={(e) => setQuery(e.target.value)}
            />
          )}

          {filtered.length === 0 ? (
            <p style={{ padding: 12, fontSize: 12, color: 'rgb(var(--ink-500))' }}>
              {list.length === 0
                ? 'Фермеров пока нет — создайте в разделе «Производители».'
                : 'Ничего не нашлось.'}
            </p>
          ) : filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id, p); setOpen(false); setQuery(''); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                background: p.id === value ? 'rgb(var(--brand-50))' : 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgb(var(--ink-900))',
              }}
            >
              <b>{p.name}</b>
              <span style={{ color: 'rgb(var(--ink-500))', fontSize: 12 }}>
                {p.region_name ? ` · ${p.region_name}` : ''}
                {p.status !== 'active' ? ' · скрыт' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
