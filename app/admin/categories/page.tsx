'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const GORGIA_CATALOG: { category: string; sub_category: string; url: string }[] = [
  // ===== IKEA =====
  { category: 'IKEA', sub_category: 'Столы и рабочие места',       url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-magidebi-da-merxebi/' },
  { category: 'IKEA', sub_category: 'Стулья',                       url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-stulebida-skamebi/' },
  { category: 'IKEA', sub_category: 'Шкафы',                        url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-karebiani-satumebi/' },
  { category: 'IKEA', sub_category: 'Гостиная',                     url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-sadzineo-aveji/' },
  { category: 'IKEA', sub_category: 'Спальня',                      url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-saZinao-aveji/' },
  { category: 'IKEA', sub_category: 'Офис и рабочий кабинет',       url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/ikeas-samushao-otaxi/' },
  { category: 'IKEA', sub_category: 'Вся мебель IKEA',              url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-aveji/' },
  { category: 'IKEA', sub_category: 'Освещение',                    url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-ganateba/' },
  { category: 'IKEA', sub_category: 'Кухня',                        url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-samzareulo/' },
  { category: 'IKEA', sub_category: 'Ванная',                       url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-saabazano/' },
  { category: 'IKEA', sub_category: 'Детская',                      url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-sabavshvo-otaxi/' },
  { category: 'IKEA', sub_category: 'Текстиль',                     url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-teqstili/' },
  { category: 'IKEA', sub_category: 'Декор',                        url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-saxlis-dekori/' },
  { category: 'IKEA', sub_category: 'Организация и хранение',       url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-saxlis-movla-da-organizeba/' },
  { category: 'IKEA', sub_category: 'Экстерьер',                    url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-eqsterieri/' },

  // ===== Мебель =====
  { category: 'Мебель', sub_category: 'Столы',                      url: 'https://gorgia.ge/ka/aveji/magidebi-da-merxebi/' },
  { category: 'Мебель', sub_category: 'Стулья',                     url: 'https://gorgia.ge/ka/aveji/skamebi/' },
  { category: 'Мебель', sub_category: 'Мягкая мебель',              url: 'https://gorgia.ge/ka/aveji/rbili-aveji/' },
  { category: 'Мебель', sub_category: 'Шкафы и стеллажи',           url: 'https://gorgia.ge/ka/aveji/karadebi-da-taroebi/' },
  { category: 'Мебель', sub_category: 'Спальня',                    url: 'https://gorgia.ge/ka/aveji/sadzinebeli/' },
  { category: 'Мебель', sub_category: 'Кухонная мебель',            url: 'https://gorgia.ge/ka/aveji/samzareulos-aveji/' },
  { category: 'Мебель', sub_category: 'Тумбочки и комоды',          url: 'https://gorgia.ge/ka/aveji/komodi-da-tumbo/' },
  { category: 'Мебель', sub_category: 'Зеркала',                    url: 'https://gorgia.ge/ka/aveji/sarke/' },
  { category: 'Мебель', sub_category: 'Фурнитура',                  url: 'https://gorgia.ge/ka/aveji/furnituris-aqsesuarebi/' },
  { category: 'Мебель', sub_category: 'Детская мебель',             url: 'https://gorgia.ge/ka/sabavshvo/sabavshvo-aveji/' },
  { category: 'Мебель', sub_category: 'Уличная мебель',             url: 'https://gorgia.ge/ka/aveji/gare-aveji/' },

  // ===== Климатическое оборудование =====
  { category: 'Климатическое оборудование', sub_category: 'Центральное отопление',   url: 'https://gorgia.ge/ka/klimaturi-teqnika/centraluri-gatbobis-sistema/' },
  { category: 'Климатическое оборудование', sub_category: 'Кондиционеры',             url: 'https://gorgia.ge/ka/klimaturi-teqnika/kondicioneri/' },
  { category: 'Климатическое оборудование', sub_category: 'Вентиляторы',              url: 'https://gorgia.ge/ka/klimaturi-teqnika/ventilatorebi/' },
  { category: 'Климатическое оборудование', sub_category: 'Водонагреватели',          url: 'https://gorgia.ge/ka/klimaturi-teqnika/wylis-gamacxeleblebi/' },
  { category: 'Климатическое оборудование', sub_category: 'Обогреватели',             url: 'https://gorgia.ge/ka/klimaturi-teqnika/gamatboblebi/' },
  { category: 'Климатическое оборудование', sub_category: 'Вентиляция',               url: 'https://gorgia.ge/ka/klimaturi-teqnika/saventilacio-sistemebi/' },
  { category: 'Климатическое оборудование', sub_category: 'Коллекторы и бойлеры',    url: 'https://gorgia.ge/ka/klimaturi-teqnika/koleqtorebi-da-boilerebi/' },

  // ===== Сантехника =====
  { category: 'Сантехника', sub_category: 'Мебель для ванной',       url: 'https://gorgia.ge/ka/santeqnika/saabazanos-aveji/' },
  { category: 'Сантехника', sub_category: 'Смесители и душевые',     url: 'https://gorgia.ge/ka/santeqnika/onkanebi-da-sashxape-sistemebi/' },
  { category: 'Сантехника', sub_category: 'Ванны и душевые кабины',  url: 'https://gorgia.ge/ka/santeqnika/abazana-da-sashxape-kabina/' },
  { category: 'Сантехника', sub_category: 'Унитазы',                  url: 'https://gorgia.ge/ka/santeqnika/unitazi-da-makompleqteblebi/' },
  { category: 'Сантехника', sub_category: 'Водоснабжение',            url: 'https://gorgia.ge/ka/santeqnika/wyalmomarageba-da-sakanalizacio-sistemebi/' },
  { category: 'Сантехника', sub_category: 'Аксессуары',               url: 'https://gorgia.ge/ka/santeqnika/saabazanos-da-tualetis-aqsesuarebi/' },
  { category: 'Сантехника', sub_category: 'Раковины',                 url: 'https://gorgia.ge/ka/santeqnika/xelsabani-da-aqsesuarebi/' },
  { category: 'Сантехника', sub_category: 'Биде и писсуары',          url: 'https://gorgia.ge/ka/santeqnika/bide-da-pisuari/' },
  { category: 'Сантехника', sub_category: 'Безопасность и изоляция',  url: 'https://gorgia.ge/ka/santeqnika/saxandzro-usafrtxoeba-da-tboizolacia/' },

  // ===== Освещение =====
  { category: 'Освещение', sub_category: 'Внутреннее освещение',          url: 'https://gorgia.ge/ka/ganateba/shida-ganateba/' },
  { category: 'Освещение', sub_category: 'Настольные лампы и торшеры',    url: 'https://gorgia.ge/ka/ganateba/magidis-sanatebi-da-torsherebi/' },
  { category: 'Освещение', sub_category: 'Уличное освещение',             url: 'https://gorgia.ge/ka/ganateba/gare-ganateba/' },
  { category: 'Освещение', sub_category: 'Техническое освещение',         url: 'https://gorgia.ge/ka/ganateba/teqnikuri-ganateba/' },
  { category: 'Освещение', sub_category: 'Кабели и удлинители',           url: 'https://gorgia.ge/ka/ganateba/damagrdzeleblebi-da-gadamyvanebi/' },
  { category: 'Освещение', sub_category: 'Монтажное оборудование',        url: 'https://gorgia.ge/ka/ganateba/samontajo-mowyobilobebi-da-aqsesuarebi/' },
  { category: 'Освещение', sub_category: 'Батарейки',                     url: 'https://gorgia.ge/ka/ganateba/elementebi-da-batareebi/' },

  // ===== Ремонт =====
  { category: 'Ремонт', sub_category: 'Двери',                       url: 'https://gorgia.ge/ka/remonti/kari/' },
  { category: 'Ремонт', sub_category: 'Полы',                        url: 'https://gorgia.ge/ka/remonti/iataki/' },
  { category: 'Ремонт', sub_category: 'Плитка',                      url: 'https://gorgia.ge/ka/remonti/keramikuli-filebi/' },
  { category: 'Ремонт', sub_category: 'Обои',                        url: 'https://gorgia.ge/ka/remonti/shpaleri-da-penoplastis-karnizebi/' },
  { category: 'Ремонт', sub_category: 'Краски',                      url: 'https://gorgia.ge/ka/remonti/laq-sagebavebi/' },
  { category: 'Ремонт', sub_category: 'Потолки',                     url: 'https://gorgia.ge/ka/remonti/samontajo-cheri/' },
  { category: 'Ремонт', sub_category: 'Окна',                        url: 'https://gorgia.ge/ka/remonti/fanjara/' },

  // ===== Строительство =====
  { category: 'Строительство', sub_category: 'Кирпич и блоки',       url: 'https://gorgia.ge/ka/mshenebloba/aguri-da-bloki/' },
  { category: 'Строительство', sub_category: 'Изоляция',              url: 'https://gorgia.ge/ka/mshenebloba/saizolacio-masalebi/' },
  { category: 'Строительство', sub_category: 'Сухие смеси',           url: 'https://gorgia.ge/ka/mshenebloba/samsheneblo-fxvnilebi/' },
  { category: 'Строительство', sub_category: 'Клеи и герметики',      url: 'https://gorgia.ge/ka/mshenebloba/webo-da-sahermetizacio-masalebi/' },
  { category: 'Строительство', sub_category: 'Расходные материалы',   url: 'https://gorgia.ge/ka/mshenebloba/saxarji-masala/' },
  { category: 'Строительство', sub_category: 'Строительный профиль',  url: 'https://gorgia.ge/ka/mshenebloba/samsheneblo-propili-da-sxva-aqsesuarebi/' },
  { category: 'Строительство', sub_category: 'Кровля и фасады',       url: 'https://gorgia.ge/ka/mshenebloba/saxuravebi-da-fasadis-sistemebi/' },
  { category: 'Строительство', sub_category: 'Лестницы',              url: 'https://gorgia.ge/ka/mshenebloba/kibis-safexurebi-da-moajirebi/' },
  { category: 'Строительство', sub_category: 'Краски интерьер',       url: 'https://gorgia.ge/ka/interieri/laq-sagebavebi/' },

  // ===== Инструменты =====
  { category: 'Инструменты', sub_category: 'Сверление и перфораторы', url: 'https://gorgia.ge/ka/xelsawyoebi/saxvreti-da-satex-sangrevi/' },
  { category: 'Инструменты', sub_category: 'Пилы и резка',            url: 'https://gorgia.ge/ka/xelsawyoebi/saxerxi-da-sachrelebi/' },
  { category: 'Инструменты', sub_category: 'Лестницы',                url: 'https://gorgia.ge/ka/xelsawyoebi/kibeebi/' },
  { category: 'Инструменты', sub_category: 'Сварка',                  url: 'https://gorgia.ge/ka/xelsawyoebi/shesadugeblebi/' },
  { category: 'Инструменты', sub_category: 'Спецодежда и защита',     url: 'https://gorgia.ge/ka/xelsawyoebi/uniforma-da-usafrtxoeba/' },
  { category: 'Инструменты', sub_category: 'Крепёж',                  url: 'https://gorgia.ge/ka/xelsawyoebi/mafiqsireblebi/' },
  { category: 'Инструменты', sub_category: 'Измерительные инструменты', url: 'https://gorgia.ge/ka/xelsawyoebi/sazomebi-da-mosanishnebi/' },
  { category: 'Инструменты', sub_category: 'Шлифовка',                url: 'https://gorgia.ge/ka/xelsawyoebi/salesi/' },
  { category: 'Инструменты', sub_category: 'Автоаксессуары',          url: 'https://gorgia.ge/ka/xelsawyoebi/saavtomobilo-aqsesuarebi/' },
  { category: 'Инструменты', sub_category: 'Генераторы и компрессоры',url: 'https://gorgia.ge/ka/xelsawyoebi/energiis-da-haeris-warmomqmneli/' },
  { category: 'Инструменты', sub_category: 'Смешивание',              url: 'https://gorgia.ge/ka/xelsawyoebi/shereva-gazaveba/' },
  { category: 'Инструменты', sub_category: 'Уборка и мойка',          url: 'https://gorgia.ge/ka/xelsawyoebi/sawmendi-da-wnevit-sarecxi/' },

  // ===== Сад =====
  { category: 'Сад', sub_category: 'Садовая мебель',                  url: 'https://gorgia.ge/ka/aveji/gare-aveji/' },
  { category: 'Сад', sub_category: 'Бассейны',                        url: 'https://gorgia.ge/ka/bagi/auzi-da-wylis-aqsesuarebi/' },
  { category: 'Сад', sub_category: 'Инструменты и инвентарь',         url: 'https://gorgia.ge/ka/bagi/bagis-xelsawyoebi-da-inventrai/' },
  { category: 'Сад', sub_category: 'Напитки и пикник',                url: 'https://gorgia.ge/ka/bagi/inventari-sasmelebistvis/' },
  { category: 'Сад', sub_category: 'Заборы и ограждения',             url: 'https://gorgia.ge/ka/bagi/gobeebi-da-barierebi/' },
  { category: 'Сад', sub_category: 'Пикник и отдых',                  url: 'https://gorgia.ge/ka/bagi/sapiknike-inventari/' },
  { category: 'Сад', sub_category: 'Декор сада',                      url: 'https://gorgia.ge/ka/bagi/bagis-dekori-da-aqsesuarebi/' },
  { category: 'Сад', sub_category: 'Полив',                           url: 'https://gorgia.ge/ka/bagi/sarwyavi-sistemebi/' },
  { category: 'Сад', sub_category: 'Рабочая одежда',                  url: 'https://gorgia.ge/ka/bagi/bagis-samushao-samosi/' },
  { category: 'Сад', sub_category: 'Растения',                        url: 'https://gorgia.ge/ka/bagi/mcenareebi/' },
  { category: 'Сад', sub_category: 'Уличные полы',                    url: 'https://gorgia.ge/ka/remonti/iataki/eqsterieris-iataki/' },

  // ===== Техника =====
  { category: 'Техника', sub_category: 'Мелкая кухонная техника',     url: 'https://gorgia.ge/ka/teqnika/samzareulos-wvrili-teqnika/' },
  { category: 'Техника', sub_category: 'Крупная техника',             url: 'https://gorgia.ge/ka/teqnika/samzareulos-msxvili-teqnika/' },
  { category: 'Техника', sub_category: 'Бытовая техника',             url: 'https://gorgia.ge/ka/teqnika/teqnika-saxlistvis/' },
  { category: 'Техника', sub_category: 'Уход за собой',               url: 'https://gorgia.ge/ka/teqnika/tavis-movla/' },

  // ===== Дом и быт =====
  { category: 'Дом и быт', sub_category: 'Кухонная утварь',           url: 'https://gorgia.ge/ka/sayofacxovrebo/churcheli-da-samzareulos-aqsesuarebi/' },
  { category: 'Дом и быт', sub_category: 'Сковороды и кастрюли',      url: 'https://gorgia.ge/ka/sayofacxovrebo/samzareulo-inventari/tafa-da-qvabi/' },
  { category: 'Дом и быт', sub_category: 'Кухонный инвентарь',        url: 'https://gorgia.ge/ka/sayofacxovrebo/samzareulo-inventari/' },
  { category: 'Дом и быт', sub_category: 'Уход за домом',             url: 'https://gorgia.ge/ka/sayofacxovrebo/sayofacxovrebo-movlis-sashualebebi/' },
  { category: 'Дом и быт', sub_category: 'Декор',                     url: 'https://gorgia.ge/ka/sayofacxovrebo/saxlis-dekori/' },
  { category: 'Дом и быт', sub_category: 'Праздничные товары',        url: 'https://gorgia.ge/ka/sayofacxovrebo/sadgesaswaulo-nivtebi/' },

  // ===== Товары для животных =====
  { category: 'Товары для животных', sub_category: 'Инвентарь',       url: 'https://gorgia.ge/ka/cxovelebis-movla/zoo-inventari/' },
  { category: 'Товары для животных', sub_category: 'Корм',            url: 'https://gorgia.ge/ka/cxovelebis-movla/sakvebi/' },

  // ===== Детские товары =====
  { category: 'Детские товары', sub_category: 'Мебель',               url: 'https://gorgia.ge/ka/sabavshvo/sabavshvo-aveji/' },
  { category: 'Детские товары', sub_category: 'Детские лампы',        url: 'https://gorgia.ge/ka/sabavshvo/sabavshvo-magidis-sanatebi/' },
  { category: 'Детские товары', sub_category: 'IKEA детская',         url: 'https://gorgia.ge/ka/ikeas-produqcia/ikeas-sabavshvo-otaxi/' },
];

type DbCategory = { category: string | null; sub_category: string | null; cnt: number };

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

  const bg  = s === 'running' ? '#333' : s === 'done' ? '#1a3a1a' : s === 'error' ? '#3a1a1a' : color;
  const tc  = s === 'running' ? '#888' : s === 'done' ? '#4ade80' : s === 'error' ? '#f87171' : '#0f1117';
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
  const [dbCats, setDbCats]       = useState<DbCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [customUrl, setCustomUrl] = useState('');
  const [customCat, setCustomCat] = useState('');
  const [customSub, setCustomSub] = useState('');
  const [search, setSearch]       = useState('');

  // ── Создание категории/подкатегории ──────────────────────────────────────
  const [newCatName, setNewCatName]       = useState('');
  const [newSubForCat, setNewSubForCat]   = useState('');
  const [newSubName, setNewSubName]       = useState('');
  const [createStatus, setCreateStatus]   = useState('');
  const [createBusy, setCreateBusy]       = useState(false);
  const [realCategories, setRealCategories] = useState<{ category_key: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(d => setRealCategories(d.categories || []))
      .catch(console.error);
  }, [createStatus]);

  async function safeJson(res: Response): Promise<any> {
    const text = await res.text();
    if (!text) return { error: `Пустой ответ (HTTP ${res.status})` };
    try { return JSON.parse(text); } catch { return { error: `Не-JSON (HTTP ${res.status}): ${text.slice(0, 200)}` }; }
  }

  async function createCategory() {
    if (!newCatName.trim()) return;
    setCreateBusy(true);
    setCreateStatus('Создаю…');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_category', name_ru: newCatName.trim() }),
      });
      const data = await safeJson(res);
      setCreateStatus(res.ok ? `✓ ${data.existed ? 'Уже была' : 'Создана'}: ${data.category_key}` : `✕ ${data.error}`);
      if (res.ok) setNewCatName('');
    } catch (e) {
      setCreateStatus(`✕ Ошибка сети: ${String(e)}`);
    } finally {
      setCreateBusy(false);
    }
  }

  async function createSubcategory() {
    if (!newSubForCat || !newSubName.trim()) return;
    setCreateBusy(true);
    setCreateStatus('Создаю…');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_subcategory', category_key: newSubForCat, name_ru: newSubName.trim() }),
      });
      const data = await safeJson(res);
      setCreateStatus(res.ok ? `✓ ${data.existed ? 'Уже была' : 'Создана'}: ${data.key}` : `✕ ${data.error}`);
      if (res.ok) setNewSubName('');
    } catch (e) {
      setCreateStatus(`✕ Ошибка сети: ${String(e)}`);
    } finally {
      setCreateBusy(false);
    }
  }

  useEffect(() => {
    fetch('/api/admin/categories-stats')
      .then(r => r.json())
      .then(d => { setDbCats(d.categories || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = GORGIA_CATALOG.filter(c =>
    !search ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    c.sub_category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, typeof GORGIA_CATALOG> = {};
  for (const c of filtered) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  function getCount(category: string, sub: string) {
    const row = dbCats.find(r => r.category === category && (sub ? r.sub_category === sub : true));
    return row?.cnt ?? 0;
  }

  function getCategoryTotal(category: string) {
    return dbCats.filter(r => r.category === category).reduce((s, r) => s + r.cnt, 0);
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
          <Link href="/admin"           style={{ color: '#aaa', fontSize: 13, padding: '6px 12px', textDecoration: 'none' }}>Дашборд</Link>
          <Link href="/admin/products"  style={{ color: '#aaa', fontSize: 13, padding: '6px 12px', textDecoration: 'none' }}>Товары</Link>
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

        {/* Поиск */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск категории..."
            style={{ padding: '8px 14px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 280, outline: 'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕ сбросить</button>}
          <span style={{ color: '#444', fontSize: 12 }}>{filtered.length} категорий</span>
        </div>

        {/* Таблица категорий */}
        {Object.entries(grouped).map(([cat, subs]) => (
          <div key={cat} style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e2130' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{cat}</span>
                {!loading && badge(getCategoryTotal(cat))}
              </div>
              <RunBtn
                label="▶ Парсить всю категорию"
                url={`/api/admin/trigger-category?category=${encodeURIComponent(cat)}`}
                color="#60a5fa" small
              />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {subs.map((s, i) => {
                  const cnt = s.sub_category ? getCount(s.category, s.sub_category) : getCategoryTotal(s.category);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1e2130' }}>
                      <td style={{ padding: '10px 20px', color: s.sub_category ? '#aaa' : '#888', width: 240 }}>
                        {s.sub_category || <span style={{ color: '#555', fontStyle: 'italic' }}>все товары</span>}
                      </td>
                      <td style={{ padding: '10px 12px', width: 80 }}>
                        {!loading && cnt > 0
                          ? badge(cnt)
                          : !loading && <span style={{ color: '#333', fontSize: 11 }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px', color: '#333', fontSize: 11, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.url}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <RunBtn
                          label="▶ Парсить"
                          url={`/api/admin/trigger-category?url=${encodeURIComponent(s.url)}&category=${encodeURIComponent(s.category)}&sub_category=${encodeURIComponent(s.sub_category)}`}
                          color="#2a3a0a" small
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Создать категорию / подкатегорию — реальные канонические таблицы categories/subcategories */}
        <div style={{ background: '#1a1d27', border: '1px solid #3a4a1e', borderRadius: 12, padding: '24px', marginTop: 24 }}>
          <h3 style={{ color: '#c8f135', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            + Новая категория / подкатегория
          </h3>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>Название категории (ru)</div>
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Обогреватели"
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 240, outline: 'none' }} />
            </div>
            <button onClick={createCategory} disabled={createBusy || !newCatName.trim()}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#c8f135', color: '#0f1117', fontSize: 13, fontWeight: 600 }}>
              Создать категорию (EN/KA автоматически)
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>В какую категорию</div>
              <select value={newSubForCat} onChange={e => setNewSubForCat(e.target.value)}
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 240, outline: 'none' }}>
                <option value="">— выберите —</option>
                {realCategories.map(c => <option key={c.category_key} value={c.category_key}>{c.name} [{c.category_key}]</option>)}
              </select>
            </div>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>Название подкатегории (ru)</div>
              <input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Вентиляторы"
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 240, outline: 'none' }} />
            </div>
            <button onClick={createSubcategory} disabled={createBusy || !newSubForCat || !newSubName.trim()}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              Создать подкатегорию (EN/KA автоматически)
            </button>
          </div>

          {createStatus && (
            <div style={{ marginTop: 12, fontSize: 12, color: createStatus.startsWith('✓') ? '#4ade80' : '#f87171' }}>
              {createStatus}
            </div>
          )}
        </div>

        {/* Новая категория вручную */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '24px', marginTop: 24 }}>
          <h3 style={{ color: '#666', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Произвольный URL
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>URL</div>
              <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://gorgia.ge/ka/..."
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 340, outline: 'none' }} />
            </div>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>Категория</div>
              <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="Мебель"
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 160, outline: 'none' }} />
            </div>
            <div>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 5 }}>Подкатегория</div>
              <input value={customSub} onChange={e => setCustomSub(e.target.value)} placeholder="Диваны"
                style={{ padding: '8px 12px', background: '#131620', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 13, width: 160, outline: 'none' }} />
            </div>
            <RunBtn
              label="▶ Запустить"
              url={`/api/admin/trigger-category?url=${encodeURIComponent(customUrl)}&category=${encodeURIComponent(customCat)}&sub_category=${encodeURIComponent(customSub)}`}
              color="#c8f135"
            />
          </div>
        </div>

      </div>
    </div>
  );
}