'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.register({ name: form.name, email: form.email, password: form.password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : 3;
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];
  const strengthColors = ['', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div className="bg-mesh" />
      <div className="glass scale-in" style={{ width: '100%', maxWidth: 460, padding: '48px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>PathIQ</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>Create your account</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: 32 }}>Join thousands of students practicing interviews together</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#f87171', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label className="label">Full Name</label>
            <input id="name" className="input" type="text" placeholder="Dinesh Kumar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </div>
          <div>
            <label className="label">Email</label>
            <input id="reg-email" className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="reg-password" className="input" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} style={{ paddingRight: 40 }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {form.password && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {[1, 2, 3].map((level) => (
                  <div key={level} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= level ? strengthColors[strength] : 'var(--color-surface-3)', transition: 'background 0.3s' }} />
                ))}
                <span style={{ fontSize: '0.72rem', color: strengthColors[strength], fontWeight: 600, minWidth: 40 }}>{strengthLabels[strength]}</span>
              </div>
            )}
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input id="confirm-password" className="input" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required style={{ paddingRight: 40 }} />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button id="register-btn" className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, padding: '13px', fontSize: '0.95rem' }}>
            {loading ? <span className="spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : 'Create Account →'}
          </button>
        </form>

        <p style={{ marginTop: 28, textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
