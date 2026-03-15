'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Все категории gorgia.ge с URL для парсинга
const GORGIA_CATALOG: { category: string; sub_category: string; url: string }[] = [
  // IKEA
  { category: 'IKEA', sub_category: 'Столы',        url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-magidebi-da-merxebi/' },
  { category: 'IKEA', sub_category: 'Стулья',       url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-stulebida-skamebi/' },
  { category: 'IKEA', sub_category: 'Шкафы',        url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-karebiani-satumebi/' },
  { category: 'IKEA', sub_category: 'Гостиная',     url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-sadzineo-aveji/' },
  { category: 'IKEA', sub_category: 'Спальня',      url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-saZinao-aveji/' },
  { category: 'IKEA', sub_category: 'Освещение',    url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-ganaTeba/' },
  { category: 'IKEA', sub_category: 'Кухня',        url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-samzareulosaTvis/' },
  { category: 'IKEA', sub_category: 'Ванная',       url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-abazanisaTvis/' },
  { category: 'IKEA', sub_category: 'Детская',      url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-saTamaSoebi-da-bavSvTa-aveji/' },
  { category: 'IKEA', sub_category: 'Текстиль',     url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-tekstili/' },
  { category: 'IKEA', sub_category: 'Декор',        url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-dekoracia/' },
  // Климатическое оборудование
  { category: 'Климатическое оборудование', sub_category: 'Кондиционеры',   url: 'https://gorgia.ge/ka/klimaturi-teqnika/kondicionerebi/' },
  { category: 'Климатическое оборудование', sub_category: 'Вентиляция',     url: 'https://gorgia.ge/ka/klimaturi-teqnika/saventilacio-sistemebi/' },
  { category: 'Климатическое оборудование', sub_category: 'Водонагреватели',url: 'https://gorgia.ge/ka/klimaturi-teqnika/wylis-gamaTbobeli/' },
  { category: 'Климатическое оборудование', sub_category: 'Коллекторы',     url: 'https://gorgia.ge/ka/klimaturi-teqnika/kolektorebi/' },
  { category: 'Климатическое оборудование', sub_category: 'Обогреватели',   url: 'https://gorgia.ge/ka/klimaturi-teqnika/gamaTbobeli-aparatebi/' },
  // Мебель
  { category: 'Мебель', sub_category: 'Столы',         url: 'https://gorgia.ge/ka/avejis-maRazia/magidebidamerxebi/' },
  { category: 'Мебель', sub_category: 'Стулья',        url: 'https://gorgia.ge/ka/avejis-maRazia/skrebi/' },
  { category: 'Мебель', sub_category: 'Вешалки',       url: 'https://gorgia.ge/ka/avejis-maRazia/vesalkebi/' },
  { category: 'Мебель', sub_category: 'Тумбочки',      url: 'https://gorgia.ge/ka/avejis-maRazia/tumbo/' },
  { category: 'Мебель', sub_category: 'Уличная мебель',url: 'https://gorgia.ge/ka/avejis-maRazia/quchis-aveji/' },
  { category: 'Мебель', sub_category: 'Детская мебель',url: 'https://gorgia.ge/ka/avejis-maRazia/bavSvTa-aveji/' },
  // Остальные
  { category: 'Сад',       sub_category: '', url: 'https://gorgia.ge/ka/baRi-da-aivani/' },
  { category: 'Туризм',    sub_category: '', url: 'https://gorgia.ge/ka/turizmi-da-dasveneba/' },
  { category: 'Сантехника',sub_category: 'Смесители', url: 'https://gorgia.ge/ka/santeknika/smesitelebi/' },
  { category: 'Сантехника',sub_category: 'Раковины',  url: 'https://gorgia.ge/ka/santeknika/rakovina/' },
  { category: 'Освещение', sub_category: 'Настольные лампы', url: 'https://gorgia.ge/ka/ganateba/magidis-naTurebi/' },
  { category: 'Игрушки',   sub_category: '', url: 'https://gorgia.ge/ka/saTamaSoebi/' },
  { category: 'Товары для животных', sub_category: '', url: 'https://gorgia.ge/ka/cxovelebisTvis/' },
  { category: 'Обогреватели', sub_category: '', url: 'https://gorgia.ge/ka/klimaturi-teqnika/gamaTbobeli-aparatebi/' },
];

type DbCategory = { category: string | null; sub_category: string | null; cnt: number };
type JobStatus  = { status: 'idle' | 'running' | 'done' | 'error'; message: string };

const mono = "'DM Mono', 'Fira Mono', monospace";

const badge = (n: number) => (
  <span style={{ background: '#1e2a0e', color: '#c8f135', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>
    {n.toLocaleString()}
  </span>
);

function RunBtn({ label, url, color = '#c8f135', small = false }: { label: string; url: string; color?: string; small?: boolean }) {
  const [s, setS] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function run() {
    setS('running'); setMsg('');
    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setS('done'); setMsg(data.message || 'Запущено'); }
      else { setS('error'); setMsg(data.error || 'Ошибка'); }
    } catch (e) { setS('error'); setMsg(String(e)); }
    setTimeout(() => setS('idle'), 8000);
  }

  const bg = s === 'running' ? '#333' : s === 'done' ? '#1a3a1a' : s === 'error' ? '#3a1a1a' : color;
  const tc = s === 'running' ? '#888' : s === 'done' ? '#4ade80' : s === 'error' ? '#f87171' : '#0f1117';
  const lbl = s === 'running' ? '⟳ …' : s === 'done' ? '✓ ' + msg : s === 'error' ? '✕ ' + msg : label;

  return (
    <button onClick={run} disabled={s === 'running'} style={{
      padding: small ? '5px 12px' : '8px 16px',
      borderRadius: 7, border: 'none', cursor: s === 'running' ? 'not-allowed' : 'pointer',
      background: bg, color: tc, fontSize: small ? 12 : 13, fontWeight: 600,
      transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>{lbl}</button>
  );
}

export default function AdminCategoriesPage() {
  const [dbCats, setDbCats]         = useState<DbCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [customUrl, setCustomUrl]   = useState('');
  const [customCat, setCustomCat]   = useState('');
  const [customSub, setCustomSub]   = useState('');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    fetch('/api/admin/categories-stats')
      .then(r => r.json())
      .then(d => { setDbCats(d.categories || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Категории из каталога, отфильтрованные поиском
  const filtered = GORGIA_CATALOG.filter(c =>
    !search ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    c.sub_category.toLowerCase().includes(search.toLowerCase())
  );

  // Группируем по категории
  const grouped: Record<string, typeof GORGIA_CATALOG> = {};
  for (const c of filtered) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  // Находим кол-во товаров из БД для категории/подкатегории
  function getCount(category: string, sub: string) {
    const row = dbCats.find(r =>
      r.category === category && (sub ? r.sub_category === sub : true)
    );
    return row?.cnt ?? 0;
  }

  function getCategoryTotal(category: string) {
    return dbCats
      .filter(r => r.category === category)
      .reduce((s, r) => s + r.cnt, 0);
  }

  const nullCount = dbCats.find(r => r.category === null)?.cnt ?? 0;

  return (
    <div style={{ fontFamily: mono, minHeight: '100vh', background: '#0f1117', color: '#e2e4ec' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2d3a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#c8f135', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>bazariara.ge admin</span>
        </div>
        <nav style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin"          style={{ color: '#aaa', fontSize: 13, padding: '6px 12px', textDecoration: 'none' }}>Дашборд</Link>
          <Link href="/admin/products" style={{ color: '#aaa', fontSize: 13, padding: '6px 12px', textDecoration: 'none' }}>Товары</Link>
          <Link href="/admin/categories" style={{ color: '#c8f135', fontSize: 13, padding: '6px 12px', borderRadius: 6, background: '#1e2a0e', textDecoration: 'none' }}>Категории</Link>
        </nav>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Быстрые кнопки */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <RunBtn label="▶ Обновить цены и наличие" url="/api/admin/trigger-update" color="#c8f135" />
          <RunBtn label="▶ Парсить все категории"   url="/api/admin/trigger-scrape" color="#60a5fa" />
          <div style={{ color: '#444', fontSize: 12 }}>
            Без категории: <span style={{ color: nullCount > 100 ? '#facc15' : '#666' }}>{nullCount.toLocaleString()}</span> товаров
          </div>
        </div>

        {/* Поиск по каталогу */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск категории..."
            style={{ padding: '8px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 280, outline: 'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕ сбросить</button>}
        </div>

        {/* Таблица категорий */}
        {Object.entries(grouped).map(([cat, subs]) => (
          <div key={cat} style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
            {/* Заголовок категории */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e2130' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{cat}</span>
                {!loading && badge(getCategoryTotal(cat))}
              </div>
              <RunBtn
                label="▶ Парсить всю категорию"
                url={`/api/admin/trigger-category?category=${encodeURIComponent(cat)}`}
                color="#60a5fa"
                small
              />
            </div>

            {/* Подкатегории */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {subs.map((s, i) => {
                  const cnt = s.sub_category ? getCount(s.category, s.sub_category) : getCategoryTotal(s.category);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1e2130' }}>
                      <td style={{ padding: '10px 20px', color: s.sub_category ? '#aaa' : '#888', width: 220 }}>
                        {s.sub_category || <span style={{ color: '#555', fontStyle: 'italic' }}>все товары</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {!loading && cnt > 0
                          ? badge(cnt)
                          : !loading && <span style={{ color: '#444', fontSize: 11 }}>нет товаров</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px', color: '#555', fontSize: 11, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.url}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <RunBtn
                          label="▶ Парсить"
                          url={`/api/admin/trigger-category?url=${encodeURIComponent(s.url)}&category=${encodeURIComponent(s.category)}&sub_category=${encodeURIComponent(s.sub_category)}`}
                          color="#2a3a0a"
                          small
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Добавить новую категорию вручную */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '24px', marginTop: 24 }}>
          <h3 style={{ color: '#666', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Новая категория / произвольный URL
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>URL категории gorgia.ge</div>
              <input
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://gorgia.ge/ka/..."
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 340, outline: 'none' }}
              />
            </div>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>Категория (ru)</div>
              <input
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                placeholder="Мебель"
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 160, outline: 'none' }}
              />
            </div>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>Подкатегория (ru)</div>
              <input
                value={customSub}
                onChange={e => setCustomSub(e.target.value)}
                placeholder="Диваны"
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 160, outline: 'none' }}
              />
            </div>
            <RunBtn
              label="▶ Запустить парсинг"
              url={`/api/admin/trigger-category?url=${encodeURIComponent(customUrl)}&category=${encodeURIComponent(customCat)}&sub_category=${encodeURIComponent(customSub)}`}
              color="#c8f135"
            />
          </div>
          <p style={{ color: '#444', fontSize: 12, marginTop: 10 }}>
            Можно вставить любую страницу каталога gorgia.ge — агент обойдёт все страницы пагинации
          </p>
        </div>

      </div>
    </div>
  );
}
