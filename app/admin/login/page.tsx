'use client';
import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      setError('Неверный токен');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgb(var(--cream-100))',
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{
        width: 360, background: 'rgb(var(--surface))', borderRadius: 16,
        border: '1px solid rgb(var(--ink-200))', padding: '40px 36px',
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, background: 'rgb(var(--brand-600))', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, fontSize: 20,
          }}>⚡</div>
          <h1 style={{ color: 'rgb(var(--ink-900))', fontSize: 20, fontWeight: 500, margin: 0 }}>Admin panel</h1>
          <p style={{ color: 'rgb(var(--ink-500))', fontSize: 13, marginTop: 4 }}>bazariara.ge</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <span style={{ color: 'rgb(var(--ink-500))', fontSize: 12, letterSpacing: '0.05em' }}>ADMIN TOKEN</span>
            <input
              type="password" value={token} onChange={e => setToken(e.target.value)}
              placeholder="••••••••••••" required
              style={{
                display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
                background: 'rgb(var(--cream-100))', border: '1px solid rgb(var(--ink-200))', borderRadius: 8,
                color: 'rgb(var(--ink-900))', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </label>
          {error && <p style={{ color: 'rgb(var(--clay))', fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            marginTop: 20, width: '100%', padding: '11px',
            background: loading ? 'rgb(var(--ink-500))' : 'rgb(var(--brand-600))',
            color: loading ? 'rgb(var(--ink-600))' : 'rgb(var(--cream-100))',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'rgb(var(--cream-100))' }} />}>
      <LoginForm />
    </Suspense>
  );
}