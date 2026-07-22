'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login(form);
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      if (typeof errorData === 'object' && errorData !== null) {
        const messages: string[] = [];
        if (errorData.formErrors?.length) messages.push(...errorData.formErrors);
        if (errorData.fieldErrors) {
          Object.values(errorData.fieldErrors).forEach((errs: any) => messages.push(...errs));
        }
        setError(messages.join('. ') || 'Invalid input provided.');
      } else {
        setError(errorData || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div className="bg-mesh" />
      <div className="glass scale-in" style={{ width: '100%', maxWidth: 440, padding: '48px 40px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>PathIQ</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: 32 }}>Sign in to continue your practice sessions</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#f87171', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="label">Email</label>
            <input id="email" className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="password" className="input" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" style={{ paddingRight: 40 }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button id="login-btn" className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, padding: '13px', fontSize: '0.95rem' }}>
            {loading ? <span className="spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 28, textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'none' }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  );
}
