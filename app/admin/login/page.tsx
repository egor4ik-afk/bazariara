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
      justifyContent: 'center', background: '#0f1117',
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{
        width: 360, background: '#1a1d27', borderRadius: 16,
        border: '1px solid #2a2d3a', padding: '40px 36px',
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, background: '#c8f135', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, fontSize: 20,
          }}>⚡</div>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 500, margin: 0 }}>Admin panel</h1>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>bazariara.ge</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: 12, letterSpacing: '0.05em' }}>ADMIN TOKEN</span>
            <input
              type="password" value={token} onChange={e => setToken(e.target.value)}
              placeholder="••••••••••••" required
              style={{
                display: 'block', width: '100%', marginTop: 6, padding: '10px 14px',
                background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8,
                color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </label>
          {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            marginTop: 20, width: '100%', padding: '11px',
            background: loading ? '#555' : '#c8f135',
            color: loading ? '#aaa' : '#0f1117',
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
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0f1117' }} />}>
      <LoginForm />
    </Suspense>
  );
}