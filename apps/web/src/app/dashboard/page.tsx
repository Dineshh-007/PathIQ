'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { roomApi, arenaApi } from '@/services/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingArena, setCreatingArena] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // Guard: redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [isAuthenticated, router]);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const { data } = await roomApi.create();
      router.push(`/room/${data.room.roomCode}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create room');
      setCreating(false);
    }
  };

  const handleCreateArena = async () => {
    if (!user) return;
    setCreatingArena(true);
    setError('');
    try {
      const { data } = await arenaApi.create(user.id);
      router.push(`/arena/${data.room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create arena room');
      setCreatingArena(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setError('');
    try {
      await roomApi.get(joinCode.trim().toUpperCase());
      router.push(`/room/${joinCode.trim().toUpperCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Room not found. Check your code and try again.');
      setJoining(false);
    }
  };

  const handleLogout = () => { logout(); router.push('/'); };

  const tips = [
    '💡 Answer using the STAR method: Situation, Task, Action, Result.',
    '⏱️ You have 3 minutes per question. Practice being concise.',
    '🤔 Thinking out loud shows your problem-solving process to interviewers.',
    '📊 Scores are sealed until all 4 interviewers submit — no anchoring bias.',
    '🏆 The award votes are used as tiebreakers for equal scores.',
    '🤖 AI coaching activates after the session. No AI during the interview.',
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  if (!user) return null;

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <div className="bg-mesh" />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 24px', background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>PathIQ</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                {user.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user.name}</span>
            </div>
            <button onClick={handleLogout} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Sign Out</button>
          </div>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        {/* Welcome */}
        <div className="fade-in-up" style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>
            Ready to practice, <span className="text-gradient">{user.name.split(' ')[0]}</span>?
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Create a new interview room or join an existing session with your study group.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 28, color: '#f87171', fontSize: '0.88rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Main cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }}>
          {/* Create Room Card */}
          <div className="glass fade-in-up" style={{ padding: 36 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🛠️</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em' }}>Create a Room</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 28 }}>
              Host a session for up to 5 participants. You&apos;ll get a unique 6-character room code to share with your group.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[['👥', '5 participants max'], ['🗳️', '5 questions to vote from'], ['🔒', 'Private scoring rounds'], ['⏱️', 'Server-enforced timers']].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
            <button id="create-room-btn" className="btn-primary" onClick={handleCreate} disabled={creating} style={{ width: '100%', padding: '13px', fontSize: '0.9rem' }}>
              {creating ? <><span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Creating...</> : '+ Create New Room'}
            </button>
          </div>

          {/* Join Room Card */}
          <div className="glass fade-in-up" style={{ padding: 36, animationDelay: '0.1s' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em' }}>Join a Room</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 28 }}>
              Got a room code from your study partner? Enter it below to join their interview session directly.
            </p>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Room Code</label>
                <input
                  id="room-code-input"
                  className="input"
                  type="text"
                  placeholder="e.g. AB12CD"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}
                  autoComplete="off"
                />
              </div>
              <button id="join-room-btn" className="btn-primary" type="submit" disabled={joining || joinCode.length !== 6} style={{ padding: '13px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                {joining ? 'Joining...' : 'Join Session →'}
              </button>
            </form>
            <p style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--color-text-subtle)', textAlign: 'center' }}>
              Room codes are exactly 6 characters
            </p>
          </div>

          {/* Create 1v1 Arena Card */}
          <div className="glass fade-in-up" style={{ padding: 36, animationDelay: '0.2s' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⚔️</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em' }}>1v1 Coding Arena</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 28 }}>
              Host a live FAANG-style technical interview. Real-time code execution, WebRTC video, and strict evaluation rubrics.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[['📹', 'Low-latency P2P Video'], ['🚀', 'Secure code execution'], ['📝', 'FAANG questions'], ['⭐', '5-star grading rubric']].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
            <button id="create-arena-btn" className="btn-primary" onClick={handleCreateArena} disabled={creatingArena} style={{ width: '100%', padding: '13px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #e11d48, #be123c)' }}>
              {creatingArena ? <><span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Entering...</> : 'Enter Arena'}
            </button>
          </div>
        </div>

        {/* Stats + Tip Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {/* Profile Stats */}
          <div className="glass" style={{ padding: 28 }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: 16 }}>Your Stats</h3>
            <div style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary-light)' }}>{user.totalSessions}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Sessions</div>
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>{user.averageScore > 0 ? user.averageScore.toFixed(1) : '—'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Avg Score</div>
              </div>
            </div>
          </div>

          {/* Tip of the day */}
          <div className="glass" style={{ padding: 28, gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: 12 }}>💭 Pro Tip</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{randomTip}</p>
          </div>

          {/* How roles work */}
          <div className="glass" style={{ padding: 28 }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: 16 }}>Available Roles</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[['💻', 'SWE'], ['🧠', 'AI Eng'], ['📊', 'Data'], ['🌐', 'Web'], ['🔐', 'Security'], ['⚙️', 'DevOps']].map(([icon, label]) => (
                <span key={label} className="badge badge-purple" style={{ gap: 6 }}>{icon} {label}</span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
