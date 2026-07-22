'use client';
import { useState } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';
import type { AwardCategory } from '@peerprep/shared-types';

const AWARDS: { key: AwardCategory; emoji: string; label: string; desc: string }[] = [
  { key: 'best_technical', emoji: '💡', label: 'Best Technical Performer', desc: 'Demonstrated the strongest technical depth and accuracy.' },
  { key: 'best_communicator', emoji: '🗣️', label: 'Best Communicator', desc: 'Explained ideas with exceptional clarity and confidence.' },
  { key: 'best_critical_thinker', emoji: '🧠', label: 'Best Critical Thinker', desc: 'Showed outstanding reasoning, problem-solving, and creativity.' },
  { key: 'best_interviewer', emoji: '🎙️', label: 'Best Interviewer', desc: 'Asked insightful questions and gave exceptional feedback.' },
];

export default function AwardsPanel() {
  const { room, myVotes, setAwardVote, addNotification } = useRoomStore();
  const { user } = useAuthStore();
  const socket = getSocket();
  const [submitted, setSubmitted] = useState(false);

  const participants = room?.participants.filter((p) => p.userId !== user?.id) ?? [];
  const allVotesCast = AWARDS.every((a) => myVotes[a.key] !== null);

  const handleVote = (category: AwardCategory, nomineeId: string) => {
    setAwardVote(category, nomineeId);
    socket.emit('awards:vote', { nomineeId, category });
  };

  const handleSubmit = () => {
    socket.emit('awards:submit_all');
    setSubmitted(true);
    addNotification('success', '🏆 Awards submitted! Waiting for all participants...');
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="bg-mesh" />
        <div className="glass scale-in" style={{ maxWidth: 480, padding: '60px 48px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🏆</div>
          <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: 12 }}>Awards Submitted!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Waiting for all participants to submit their votes. Results will be revealed soon...
          </p>
          <div className="spin" style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '32px auto 0' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '48px 24px', position: 'relative' }}>
      <div className="bg-mesh" />
      <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏅</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
            Peer <span className="text-gradient">Award Voting</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Vote for one person per category. You cannot vote for yourself. Votes are used as tiebreakers.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {AWARDS.map((award, i) => (
            <div key={award.key} className="glass fade-in-up" style={{ padding: 28, animationDelay: `${i * 0.1}s` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 32, flexShrink: 0 }}>{award.emoji}</div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{award.label}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{award.desc}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {participants.map((p) => {
                  const selected = myVotes[award.key] === p.userId;
                  return (
                    <button key={p.userId} id={`award-${award.key}-${p.userId}`} onClick={() => handleVote(award.key, p.userId)}
                      style={{ padding: '10px 18px', borderRadius: 999, background: selected ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))' : 'var(--color-surface-2)', border: `1px solid ${selected ? 'rgba(124,58,237,0.6)' : 'var(--color-border)'}`, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: selected ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#fff' }}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: selected ? '#a78bfa' : 'var(--color-text)' }}>{p.name}</span>
                      {selected && <span style={{ fontSize: 14 }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {myVotes[award.key] && (
                <p style={{ marginTop: 10, fontSize: '0.74rem', color: '#10b981' }}>
                  ✓ Voted for {participants.find((p) => p.userId === myVotes[award.key])?.name}
                </p>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button id="submit-awards-btn" className="btn-primary" onClick={handleSubmit} disabled={!allVotesCast} style={{ padding: '14px 48px', fontSize: '1rem' }}>
            🏆 Submit Votes
          </button>
          {!allVotesCast && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
              Vote in all {AWARDS.length} categories to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
