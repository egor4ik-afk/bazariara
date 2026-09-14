import AdminNav from './AdminNav';

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'rgb(var(--cream-100))', color: 'rgb(var(--ink-900))' }}>
      <AdminNav />
      {children}
    </div>
  );
}
