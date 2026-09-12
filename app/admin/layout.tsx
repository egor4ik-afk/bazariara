import AdminNav from './AdminNav';

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#fff' }}>
      <AdminNav />
      {children}
    </div>
  );
}
