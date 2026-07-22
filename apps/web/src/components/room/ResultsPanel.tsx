'use client';
import { useState } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { aiApi } from '@/services/api';
import type { AwardCategory } from '@peerprep/shared-types';

const AWARD_LABELS: Record<AwardCategory, { emoji: string; label: string }> = {
  best_technical: { emoji: '💡', label: 'Best Technical Performer' },
  best_communicator: { emoji: '🗣️', label: 'Best Communicator' },
  best_critical_thinker: { emoji: '🧠', label: 'Best Critical Thinker' },
  best_interviewer: { emoji: '🎙️', label: 'Best Interviewer' },
};

const RANK_ICONS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

export default function ResultsPanel() {
  const { results, room } = useRoomStore();
  const { user } = useAuthStore();
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'details' | 'ai'>('leaderboard');

  const myResult = results?.participants.find((p) => p.userId === user?.id);

  const handleAiAnalyze = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { data } = await aiApi.analyze(results?.roomId ?? '');
      setAiAnalysis(data.analysis);
      setActiveTab('ai');
    } catch (err: any) {
      setAiError(err.response?.data?.error || 'AI analysis failed. Make sure your API key is configured.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!results) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '48px 24px', position: 'relative' }}>
      <div className="bg-mesh" />
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>
            Session <span className="text-gradient">Complete!</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Here are the results from your interview session.
          </p>
        </div>

        {/* My Result Banner */}
        {myResult && (
          <div className="glass glow-border scale-in" style={{ padding: '24px 32px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 40 }}>{RANK_ICONS[myResult.rank - 1]}</div>
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Your Ranking</p>
                <h2 style={{ fontWeight: 900, fontSize: '1.2rem' }}>#{myResult.rank} of {results.participants.length}</h2>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a78bfa' }}>{myResult.averageScore.toFixed(1)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Avg Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#818cf8' }}>{myResult.awardsReceived.length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Awards Won</div>
              </div>
            </div>
            {myResult.awardsReceived.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {myResult.awardsReceived.map((a) => (
                  <span key={a} className="badge badge-yellow">{AWARD_LABELS[a]?.emoji} {AWARD_LABELS[a]?.label}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--color-surface)', padding: 4, borderRadius: 12, border: '1px solid var(--color-border)' }}>
          {(['leaderboard', 'details', 'ai'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: activeTab === tab ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))' : 'transparent', color: activeTab === tab ? '#a78bfa' : 'var(--color-text-muted)', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s' }}>
              {tab === 'leaderboard' ? '🏆 Leaderboard' : tab === 'details' ? '📋 All Feedback' : '🤖 AI Coaching'}
            </button>
          ))}
        </div>

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {results.participants.map((p, i) => (
              <div key={p.userId} className="glass fade-in-up" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 16, animationDelay: `${i * 0.08}s`, borderColor: p.userId === user?.id ? 'rgba(124,58,237,0.5)' : undefined }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{RANK_ICONS[i]}</div>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, hsl(${i * 72}, 60%, 50%), hsl(${i * 72 + 40}, 50%, 40%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                  {p.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</span>
                    {p.userId === user?.id && <span className="badge badge-blue">You</span>}
                    {p.awardsReceived.map((a) => (
                      <span key={a} title={AWARD_LABELS[a]?.label}>{AWARD_LABELS[a]?.emoji}</span>
                    ))}
                  </div>
                  <div className="progress-bar" style={{ maxWidth: 240 }}>
                    <div className="progress-bar-fill" style={{ width: `${(p.averageScore / 10) * 100}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: p.averageScore >= 7 ? '#10b981' : p.averageScore >= 4 ? '#f59e0b' : '#ef4444' }}>
                    {p.averageScore.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>/ 10 avg</div>
                </div>
              </div>
            ))}

            {/* Award Winners */}
            <div className="glass" style={{ padding: 28, marginTop: 8 }}>
              <h3 style={{ fontWeight: 800, marginBottom: 20, fontSize: '1rem' }}>🏅 Award Winners</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {Object.entries(results.awardWinners).map(([cat, winnerId]) => {
                  const winner = results.participants.find((p) => p.userId === winnerId);
                  const award = AWARD_LABELS[cat as AwardCategory];
                  return winner && award ? (
                    <div key={cat} style={{ padding: '16px', borderRadius: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{award.emoji}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>{award.label}</div>
                      <div style={{ fontWeight: 800, color: '#a78bfa' }}>{winner.name}</div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="fade-in">
            {myResult && (
              <div className="glass" style={{ padding: 28 }}>
                <h3 style={{ fontWeight: 800, marginBottom: 20 }}>Feedback You Received</h3>
                {myResult.feedbackReceived.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>No written feedback was provided for your answers.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {myResult.feedbackReceived.map((f, i) => (
                      <div key={i} style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{f.evaluatorName}</span>
                          <span style={{ fontWeight: 800, color: f.score >= 7 ? '#10b981' : f.score >= 4 ? '#f59e0b' : '#ef4444' }}>{f.score}/10</span>
                        </div>
                        {f.feedback && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>&ldquo;{f.feedback}&rdquo;</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div className="fade-in">
            {!aiAnalysis && !aiLoading && (
              <div className="glass" style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>🤖</div>
                <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 10 }}>AI Interview Coach</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
                  Gemini AI will analyze your interview answers, identify strengths and weaknesses, and generate a personalized study plan.
                </p>
                {aiError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#f87171', fontSize: '0.82rem' }}>{aiError}</div>}
                <button id="ai-analyze-btn" className="btn-primary" onClick={handleAiAnalyze} style={{ padding: '13px 36px', fontSize: '0.95rem' }}>
                  ✨ Analyze My Performance
                </button>
                <p style={{ marginTop: 12, fontSize: '0.73rem', color: 'var(--color-text-subtle)' }}>Requires GEMINI_API_KEY configured on the server</p>
              </div>
            )}

            {aiLoading && (
              <div className="glass" style={{ padding: '48px', textAlign: 'center' }}>
                <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 20px' }} />
                <p style={{ color: 'var(--color-text-muted)' }}>Analyzing your performance with Gemini AI...</p>
              </div>
            )}

            {aiAnalysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="glass" style={{ padding: 28 }}>
                  <h3 style={{ fontWeight: 800, marginBottom: 12 }}>📝 Overall Summary</h3>
                  <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: '0.9rem' }}>{aiAnalysis.summary}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                  <div className="glass" style={{ padding: 28 }}>
                    <h3 style={{ fontWeight: 800, marginBottom: 14, color: '#10b981' }}>✅ Strengths</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aiAnalysis.strengths.map((s: string, i: number) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', paddingLeft: 20, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0, color: '#10b981' }}>→</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="glass" style={{ padding: 28 }}>
                    <h3 style={{ fontWeight: 800, marginBottom: 14, color: '#ef4444' }}>⚠️ Areas to Improve</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aiAnalysis.weaknesses.map((w: string, i: number) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', paddingLeft: 20, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0, color: '#ef4444' }}>→</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="glass" style={{ padding: 28 }}>
                  <h3 style={{ fontWeight: 800, marginBottom: 14, color: '#a78bfa' }}>📚 Personalized Study Plan</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {aiAnalysis.studyTopics.map((t: string, i: number) => (
                      <span key={i} className="badge badge-purple" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
