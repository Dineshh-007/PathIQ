'use client';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';
import type { Participant } from '@peerprep/shared-types';

export default function LobbyPanel({ roomCode }: { roomCode: string }) {
  const { room } = useRoomStore();
  const { user } = useAuthStore();
  const socket = getSocket();

  const myParticipant = room?.participants.find((p) => p.userId === user?.id);
  const isHost = room?.hostId === user?.id;
  const allReady = room?.participants.every((p) => p.isReady) && (room?.participants.length ?? 0) >= 2;

  const handleReady = () => socket.emit('room:ready');
  const handleStart = () => socket.emit('room:start');

  const seatColors = ['#7c3aed', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b'];

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Header */}
        <div className="glass fade-in-up" style={{ padding: '28px 32px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h1 style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.03em' }}>Waiting Lobby</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Live</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: '8px 20px', background: 'var(--color-surface-3)', borderRadius: 8, fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--color-primary-light)' }}>
              {roomCode}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(roomCode)}
              style={{ padding: '8px 14px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'inherit' }}
            >📋 Copy</button>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>Share this code</span>
          </div>
        </div>

        {/* Participants */}
        <div className="glass fade-in-up" style={{ padding: '28px 32px', marginBottom: 20, animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Participants</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {room?.participants.length ?? 0} / {room?.maxParticipants ?? 5}
            </span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar" style={{ marginBottom: 20 }}>
            <div className="progress-bar-fill" style={{ width: `${((room?.participants.length ?? 0) / (room?.maxParticipants ?? 5)) * 100}%` }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: room?.maxParticipants ?? 5 }, (_, i) => {
              const p = room?.participants[i];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: p ? 'var(--color-surface-2)' : 'transparent', border: `1px solid ${p ? 'var(--color-border)' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.3s' }}>
                  {p ? (
                    <>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${seatColors[i]}, ${seatColors[(i + 1) % seatColors.length]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                          {p.userId === room?.hostId && <span className="badge badge-purple">Host</span>}
                          {p.userId === user?.id && <span className="badge badge-blue">You</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: 2 }}>Seat {i + 1}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.isConnected
                          ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                          : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
                        {p.isReady
                          ? <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Ready</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)' }}>Waiting</span>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.1)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-subtle)' }}>Waiting for player...</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="fade-in-up" style={{ display: 'flex', gap: 12, animationDelay: '0.2s' }}>
          {!myParticipant?.isReady && (
            <button id="ready-btn" className="btn-primary" onClick={handleReady} style={{ flex: 1, padding: '14px', fontSize: '0.95rem' }}>
              ✅ I&apos;m Ready
            </button>
          )}
          {myParticipant?.isReady && (
            <div style={{ flex: 1, padding: '14px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
              ✅ Ready!
            </div>
          )}
          {isHost && (
            <button id="start-session-btn" className="btn-primary" onClick={handleStart} style={{ flex: 1, padding: '14px', fontSize: '0.95rem', background: allReady ? undefined : 'linear-gradient(135deg, #374151, #4b5563)' }}>
              🚀 {allReady ? 'Start Session' : 'Start Anyway (Host)'}
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button 
            className="btn-ghost" 
            style={{ color: '#ef4444', fontSize: '0.85rem' }}
            onClick={() => {
              if (confirm(isHost ? 'Are you sure you want to end this room?' : 'Are you sure you want to leave this room?')) {
                socket.emit('room:leave');
                useRoomStore.getState().reset();
                window.location.href = '/dashboard';
              }
            }}
          >
            {isHost ? '🛑 End Room' : '🚪 Leave Room'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
          {allReady ? 'All participants ready! Session will start automatically.' : 'Session starts when all participants are ready, or the host starts manually.'}
        </p>
      </div>
    </div>
  );
}
