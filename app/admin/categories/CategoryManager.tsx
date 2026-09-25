'use client';

import { useCallback, useEffect, useState } from 'react';

type Cat = {
  category_key: string; name: string; name_en: string | null; name_ka: string | null;
  category_image: string | null; products: number;
};
type Sub = {
  category_key: string; key: string; name: string; name_en: string | null; name_ka: string | null;
  products: number;
};

const box = {
  padding: '7px 10px', background: 'rgb(var(--cream-200))', border: '1px solid rgb(var(--ink-200))',
  borderRadius: 7, color: 'rgb(var(--ink-900))', fontSize: 13, outline: 'none', width: '100%',
} as const;
const btn = (kind: 'main' | 'ghost' | 'danger' = 'ghost') => ({
  padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  border: kind === 'main' ? 'none' : `1px solid ${kind === 'danger' ? 'rgb(var(--clay) / .5)' : 'rgb(var(--ink-200))'}`,
  background: kind === 'main' ? 'rgb(var(--brand-600))' : 'transparent',
  color: kind === 'main' ? 'rgb(var(--on-brand))' : kind === 'danger' ? 'rgb(var(--clay))' : 'rgb(var(--ink-700))',
});

async function api(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/categories', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { data, status: res.status });
  return data;
}

async function translate(name: string): Promise<{ en: string; ka: string }> {
  const res = await fetch('/api/admin/generate-description', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name_ru: name, mode: 'name' }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || 'перевод не удался');
  return { en: d.en || '', ka: d.ka || '' };
}

/**
 * Управление категориями сайта: правка названий на трёх языках, картинка,
 * удаление с переносом товаров, подкатегории. Раньше на странице можно
 * было только создать категорию — ни поправить название, ни удалить.
 */
export default function CategoryManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [edit, setEdit] = useState<Cat | null>(null);
  const [editSub, setEditSub] = useState<Sub | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', name_en: '', name_ka: '' });

  const load = useCallback(async () => {
    const d = await api({ action: 'list_site_categories' });
    setCats(d.categories); setSubs(d.subcategories);
  }, []);
  useEffect(() => { load().catch((e) => setMsg({ text: e.message, err: true })); }, [load]);

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true); setMsg(null);
    try { const t = await fn(); if (t) setMsg({ text: t }); await load(); }
    catch (e: any) { setMsg({ text: e.message, err: true }); }
    setBusy(false);
  };

  const saveCat = () => run(async () => {
    if (!edit) return;
    const d = await api({ action: 'update_category', ...edit });
    setEdit(null);
    return `Сохранено. Обновлено товаров: ${d.products_updated}`;
  });

  const deleteCat = (c: Cat) => run(async () => {
    if (c.products === 0) {
      if (!confirm(`Удалить категорию «${c.name}»?`)) return;
      await api({ action: 'delete_category', category_key: c.category_key });
      return `Категория «${c.name}» удалена`;
    }
    // С товарами — только с переносом, иначе они пропадут с сайта
    const others = cats.filter((x) => x.category_key !== c.category_key);
    const list = others.map((x, i) => `${i + 1}. ${x.name}`).join('\n');
    const pick = prompt(
      `В «${c.name}» ${c.products} товаров. Куда их перенести?\nВведите номер:\n\n${list}`
    );
    const target = others[Number(pick) - 1];
    if (!target) return;
    if (!confirm(`Перенести ${c.products} товаров в «${target.name}» и удалить «${c.name}»?`)) return;
    const d = await api({ action: 'delete_category', category_key: c.category_key, move_to: target.category_key });
    return `«${c.name}» удалена, перенесено товаров: ${d.moved_products}`;
  });

  const saveSub = () => run(async () => {
    if (!editSub) return;
    const d = await api({ action: 'update_subcategory', ...editSub });
    setEditSub(null);
    return `Подкатегория сохранена. Обновлено товаров: ${d.products_updated}`;
  });

  const deleteSub = (s: Sub) => run(async () => {
    const note = s.products ? `\n${s.products} товаров останутся в категории без подкатегории.` : '';
    if (!confirm(`Удалить подкатегорию «${s.name}»?${note}`)) return;
    await api({ action: 'delete_subcategory', key: s.key });
    return `Подкатегория «${s.name}» удалена`;
  });

  const createCat = () => run(async () => {
    if (!newCat.name.trim()) throw new Error('Введите название');
    // Пустые en/ka API переведёт само
    await api({ action: 'create_category', name_ru: newCat.name.trim(), name_en: newCat.name_en, name_ka: newCat.name_ka });
    setNewCat({ name: '', name_en: '', name_ka: '' });
    return `Категория «${newCat.name}» создана`;
  });

  const card = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--ink-200))', borderRadius: 12 } as const;

  return (
    <section style={{ ...card, padding: 20, marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Категории сайта</h2>
      <p style={{ fontSize: 12, color: 'rgb(var(--ink-500))', margin: '0 0 16px' }}>
        Названия меняются сразу на всех товарах категории. Категорию с товарами можно удалить только с переносом.
      </p>

      {msg && (
        <p style={{ fontSize: 13, marginBottom: 12, color: msg.err ? 'rgb(var(--clay))' : 'rgb(var(--brand-600))' }}>
          {msg.text}
        </p>
      )}

      <div style={{ display: 'grid', gap: 6 }}>
        {cats.map((c) => {
          const cs = subs.filter((s) => s.category_key === c.category_key);
          const editing = edit?.category_key === c.category_key;
          return (
            <div key={c.category_key} style={{ border: '1px solid rgb(var(--ink-200))', borderRadius: 10 }}>
              {editing ? (
                <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
                    <input style={box} value={edit!.name} placeholder="Название (ru)"
                      onChange={(e) => setEdit({ ...edit!, name: e.target.value })} />
                    <input style={box} value={edit!.name_en || ''} placeholder="Name (en)"
                      onChange={(e) => setEdit({ ...edit!, name_en: e.target.value })} />
                    <input style={box} value={edit!.name_ka || ''} placeholder="სახელი (ka)"
                      onChange={(e) => setEdit({ ...edit!, name_ka: e.target.value })} />
                  </div>
                  <input style={box} value={edit!.category_image || ''} placeholder="Картинка (URL) — если пусто, берётся фото первого товара"
                    onChange={(e) => setEdit({ ...edit!, category_image: e.target.value })} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={btn('main')} disabled={busy} onClick={saveCat}>Сохранить</button>
                    <button style={btn()} disabled={busy} onClick={() => run(async () => {
                      const t = await translate(edit!.name);
                      setEdit({ ...edit!, name_en: t.en, name_ka: t.ka });
                    })}>🌐 Перевести</button>
                    <button style={btn()} onClick={() => setEdit(null)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setOpen(open === c.category_key ? null : c.category_key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--ink-500))', width: 16 }}
                    aria-label="Подкатегории"
                  >{cs.length ? (open === c.category_key ? '▾' : '▸') : ''}</button>
                  <div style={{ flexGrow: 1, minWidth: 180 }}>
                    <b>{c.name}</b>
                    <span style={{ fontSize: 12, color: 'rgb(var(--ink-500))' }}>
                      {' '}· {c.name_en || <i style={{ color: 'rgb(var(--clay))' }}>нет en</i>}
                      {' '}· {c.name_ka || <i style={{ color: 'rgb(var(--clay))' }}>нет ka</i>}
                    </span>
                    <div style={{ fontSize: 11, color: 'rgb(var(--ink-500))' }}>
                      {c.category_key} · товаров: {c.products} · подкатегорий: {cs.length}
                    </div>
                  </div>
                  <button style={btn()} onClick={() => setEdit({ ...c })}>Править</button>
                  <button style={btn('danger')} disabled={busy} onClick={() => deleteCat(c)}>Удалить</button>
                </div>
              )}

              {open === c.category_key && cs.length > 0 && (
                <div style={{ borderTop: '1px solid rgb(var(--ink-200))', padding: '6px 12px 10px 38px', display: 'grid', gap: 4 }}>
                  {cs.map((s) => editSub?.key === s.key ? (
                    <div key={s.key} style={{ display: 'grid', gap: 6, padding: '6px 0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6 }}>
                        <input style={box} value={editSub!.name} onChange={(e) => setEditSub({ ...editSub!, name: e.target.value })} />
                        <input style={box} value={editSub!.name_en || ''} placeholder="en" onChange={(e) => setEditSub({ ...editSub!, name_en: e.target.value })} />
                        <input style={box} value={editSub!.name_ka || ''} placeholder="ka" onChange={(e) => setEditSub({ ...editSub!, name_ka: e.target.value })} />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={btn('main')} disabled={busy} onClick={saveSub}>Сохранить</button>
                        <button style={btn()} disabled={busy} onClick={() => run(async () => {
                          const t = await translate(editSub!.name);
                          setEditSub({ ...editSub!, name_en: t.en, name_ka: t.ka });
                        })}>🌐 Перевести</button>
                        <button style={btn()} onClick={() => setEditSub(null)}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ flexGrow: 1 }}>
                        {s.name}
                        <span style={{ color: 'rgb(var(--ink-500))', fontSize: 12 }}>
                          {' '}· {s.name_en || '—'} · {s.name_ka || '—'} · {s.products} тов.
                        </span>
                      </span>
                      <button style={btn()} onClick={() => setEditSub({ ...s })}>Править</button>
                      <button style={btn('danger')} disabled={busy} onClick={() => deleteSub(s)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Новая категория */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed rgb(var(--ink-200))' }}>
        <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>+ Новая категория</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
          <input style={box} value={newCat.name} placeholder="Название (ru)" onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <input style={box} value={newCat.name_en} placeholder="Name (en)" onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })} />
          <input style={box} value={newCat.name_ka} placeholder="სახელი (ka)" onChange={(e) => setNewCat({ ...newCat, name_ka: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button style={btn('main')} disabled={busy} onClick={createCat}>Создать</button>
          <button style={btn()} disabled={busy || !newCat.name.trim()} onClick={() => run(async () => {
            const t = await translate(newCat.name);
            setNewCat({ ...newCat, name_en: t.en, name_ka: t.ka });
          })}>🌐 Перевести</button>
        </div>
      </div>
    </section>
  );
}
