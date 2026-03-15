'use client';
import { useState } from 'react';
import Link from 'next/link';

type Stats = {
  total: number; inStock: number; outOfStock: number; categories: number;
  updatedToday: number; price: { min: number; max: number; avg: number };
  noPhoto: number; noSku: number;
};
type RecentRow = { id: number; external_id: string; name: string; price: string; in_stock: boolean; updated_at: string };

const s: React.CSSProperties = {
  fontFamily: "'DM Mono', 'Fira Mono', monospace",
  minHeight: '100vh',
  background: '#0f1117',
  color: '#e2e4ec',
  padding: '0',
};

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: '#1a1d27', borderRadius: 12, border: '1px solid #2a2d3a',
      padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={{ color: '#555', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 600, color: accent || '#fff', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ color: '#666', fontSize: 12 }}>{sub}</span>}
    </div>
  );
}

function RunButton({ label, endpoint, color }: { label: string; endpoint: string; color: string }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function run() {
    setState('running');
    setMsg('');
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setState('done'); setMsg(data.message || 'Запущено'); }
      else { setState('error'); setMsg(data.error || 'Ошибка'); }
    } catch (e) {
      setState('error');
      setMsg(String(e));
    }
    setTimeout(() => setState('idle'), 8000);
  }

  const bg = state === 'running' ? '#333' : state === 'done' ? '#1a3a1a' : state === 'error' ? '#3a1a1a' : color;
  const textColor = state === 'running' ? '#888' : state === 'done' ? '#4ade80' : state === 'error' ? '#f87171' : '#0f1117';
  const btnLabel = state === 'running' ? '⟳ Запускается...' : state === 'done' ? '✓ ' + msg : state === 'error' ? '✕ ' + msg : label;

  return (
    <button
      onClick={run}
      disabled={state === 'running'}
      style={{
        padding: '10px 20px', borderRadius: 8, border: 'none', cursor: state === 'running' ? 'not-allowed' : 'pointer',
        background: bg, color: textColor, fontSize: 13, fontWeight: 600,
        transition: 'all 0.2s', minWidth: 200,
      }}
    >
      {btnLabel}
    </button>
  );
}

export default function AdminDashboardClient({ stats, recent }: { stats: Stats; recent: RecentRow[] }) {
  return (
    <div style={s}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2d3a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: '#c8f135', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>bazariara.ge admin</span>
        </div>
        <nav style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin" style={{ color: '#c8f135', fontSize: 13, padding: '6px 12px', borderRadius: 6, background: '#1e2a0e', textDecoration: 'none' }}>Дашборд</Link>
          <Link href="/admin/products" style={{ color: '#aaa', fontSize: 13, padding: '6px 12px', borderRadius: 6, textDecoration: 'none' }}>Товары</Link>
          <Link href="/admin/categories" style={{ color: '#aaa', fontSize: 13, padding: '6px 12px', borderRadius: 6, textDecoration: 'none' }}>Категории</Link>
          <Link href="/" target="_blank" style={{ color: '#555', fontSize: 13, padding: '6px 12px', textDecoration: 'none' }}>→ Сайт</Link>
        </nav>
      </div>

      <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Всего товаров" value={stats.total.toLocaleString()} />
          <StatCard label="В наличии" value={stats.inStock.toLocaleString()} accent="#4ade80" />
          <StatCard label="Нет в наличии" value={stats.outOfStock.toLocaleString()} accent="#f87171" />
          <StatCard label="Обновлено сегодня" value={stats.updatedToday.toLocaleString()} sub="за последние 24ч" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          <StatCard label="Категорий" value={stats.categories} />
          <StatCard label="Без фото" value={stats.noPhoto} accent={stats.noPhoto > 50 ? '#facc15' : '#aaa'} />
          <StatCard label="Без SKU" value={stats.noSku} accent={stats.noSku > 100 ? '#facc15' : '#aaa'} />
          <StatCard label="Средняя цена" value={`${stats.price.avg} ₾`} sub={`${stats.price.min}–${stats.price.max} ₾`} />
        </div>

        {/* Scraper controls */}
        <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '24px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Управление парсером
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <RunButton label="▶ Обновить цены и наличие" endpoint="/api/admin/trigger-update" color="#c8f135" />
            <RunButton label="▶ Полный парсинг сайта" endpoint="/api/admin/trigger-scrape" color="#60a5fa" />
            <span style={{ color: '#444', fontSize: 12 }}>Полный парсинг может занять несколько часов</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Recent activity */}
          <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Последние обновления</h2>
              <Link href="/admin/products" style={{ color: '#c8f135', fontSize: 12, textDecoration: 'none' }}>Все товары →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(r => (
                <Link key={r.id} href={`/admin/products/${r.id}`} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8, background: '#131620',
                  textDecoration: 'none', border: '1px solid transparent',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2d3a')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: r.in_stock ? '#4ade80' : '#f87171' }} />
                    <span style={{ color: '#ccc', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0, alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: 13 }}>{r.price ? Number(r.price).toFixed(0) + ' ₾' : '—'}</span>
                    <span style={{ color: '#444', fontSize: 11 }}>{new Date(r.updated_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '24px' }}>
            <h2 style={{ fontSize: 14, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>Быстрые фильтры</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Товары без фото', href: '/admin/products?filter=no_photo', count: stats.noPhoto, color: '#facc15' },
                { label: 'Товары без SKU', href: '/admin/products?filter=no_sku', count: stats.noSku, color: '#facc15' },
                { label: 'Нет в наличии', href: '/admin/products?in_stock=false', count: stats.outOfStock, color: '#f87171' },
                { label: 'Все товары', href: '/admin/products', count: stats.total, color: '#4ade80' },
              ].map(link => (
                <Link key={link.href} href={link.href} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 8, background: '#131620',
                  textDecoration: 'none', border: '1px solid transparent',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2d3a')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                >
                  <span style={{ color: '#ccc', fontSize: 14 }}>{link.label}</span>
                  <span style={{ color: link.color, fontSize: 14, fontWeight: 600 }}>{link.count.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
