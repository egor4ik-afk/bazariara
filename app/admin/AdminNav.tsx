'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Единая навигация админки.
 *
 * Раньше каждая страница рисовала свою панель со своим набором ссылок.
 * Из-за этого новый раздел появлялся в коде, но найти его можно было
 * только по прямому адресу — он просто не попадал ни в одно меню.
 * Теперь панель одна, в layout, и добавление раздела = одна строка здесь.
 */

const ITEMS = [
  { href: '/admin',            label: 'Дашборд',   exact: true },
  { href: '/admin/products',   label: 'Товары' },
  { href: '/admin/categories', label: 'Категории' },
  { href: '/admin/producers',  label: 'Производители', badge: 'applications' },
  { href: '/admin/blog',       label: 'Блог' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [newApps, setNewApps] = useState(0);

  // Счётчик новых заявок: без него они лежат неделями незамеченными.
  useEffect(() => {
    fetch('/api/admin/producers?what=applications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.applications) return;
        setNewApps(d.applications.filter((a: any) => a.status === 'new').length);
      })
      .catch(() => {});
  }, [pathname]);

  const isActive = (item: (typeof ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px',
      borderBottom: '1px solid rgb(var(--surface-2))', background: 'rgb(var(--cream-100))', flexWrap: 'wrap',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 30, height: 30, background: 'rgb(var(--brand-600))', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>⚡</div>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'rgb(var(--ink-900))' }}>bazariara.ge admin</span>
      </Link>

      <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: active ? 'rgb(var(--brand-600))' : 'rgb(var(--ink-600))',
                background: active ? 'rgb(var(--brand-50))' : 'transparent',
                fontSize: 13, padding: '6px 12px', borderRadius: 6,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {item.label}
              {item.badge === 'applications' && newApps > 0 && (
                <span style={{
                  background: 'rgb(var(--clay))', color: 'rgb(var(--ink-900))', fontSize: 10, fontWeight: 700,
                  borderRadius: 99, padding: '1px 6px', lineHeight: 1.6,
                }}>
                  {newApps}
                </span>
              )}
            </Link>
          );
        })}
        <ThemeToggle />
      </nav>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <Link href="/admin/products/new" style={{
          color: 'rgb(var(--cream-100))', fontSize: 13, padding: '6px 14px', borderRadius: 6,
          background: 'rgb(var(--brand-600))', textDecoration: 'none', fontWeight: 600,
        }}>
          + Товар
        </Link>
        <a href="/ru" target="_blank" rel="noreferrer" style={{
          color: 'rgb(var(--ink-600))', fontSize: 13, padding: '6px 12px', textDecoration: 'none',
        }}>
          Сайт ↗
        </a>
      </div>
    </div>
  );
}
