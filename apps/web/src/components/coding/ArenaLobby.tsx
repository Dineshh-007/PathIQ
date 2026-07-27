'use client';

import { useState, useEffect } from 'react';
import { CodingQuestion, CodingRoom } from '@peerprep/shared-types';
import { api } from '@/services/api';

interface ArenaLobbyProps {
  room: CodingRoom;
  userId: string;
  onProposeQuestions: (questionIds: string[]) => void;
  onSelectQuestion: (questionId: string) => void;
  onJoinSession: () => void;
}

export default function ArenaLobby({ room, userId, onProposeQuestions, onSelectQuestion }: ArenaLobbyProps) {
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const isInterviewer = userId === room.interviewerId;
  const isCandidate = userId === room.candidateId;
  const session = room.sessions?.[0];

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await api.get('/coding/questions');
        setQuestions(res.data.questions);
      } catch (err) {
        console.error('Failed to load questions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const toggleSelection = (id: string) => {
    if (isInterviewer) {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(q => q !== id));
      } else {
        if (selectedIds.length < 5) setSelectedIds([...selectedIds, id]);
      }
    } else if (isCandidate) {
      setSelectedIds([id]);
    }
  };

  const handleSubmit = () => {
    if (isInterviewer && selectedIds.length > 0) {
      onProposeQuestions(selectedIds);
    } else if (isCandidate && selectedIds.length === 1) {
      onSelectQuestion(selectedIds[0]);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white' }}>
        <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
      </div>
    );
  }

  // Phase: Proposing (Interviewer picks 3-5)
  if (!session || session.phase === 'proposing') {
    return (
      <div style={{ minHeight: '100dvh', background: '#08080f', color: 'white', padding: '48px 24px' }}>
        <div className="bg-mesh" />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 className="fade-in-up" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>
            {isInterviewer ? (
              <>Select Questions for the <span className="text-gradient">Candidate</span></>
            ) : (
              <>Waiting for <span className="text-gradient">Interviewer</span></>
            )}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: 36 }}>
            {isInterviewer 
              ? 'Choose 3-5 questions. The candidate will then pick exactly 1 to solve.' 
              : 'The interviewer is currently selecting a pool of questions for you.'}
          </p>

          {isInterviewer ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {questions.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => toggleSelection(q.id)}
                    className="glass"
                    style={{
                      padding: 20,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: selectedIds.includes(q.id) 
                        ? '1px solid var(--color-primary)' 
                        : '1px solid var(--color-border)',
                      background: selectedIds.includes(q.id) 
                        ? 'rgba(99,102,241,0.1)' 
                        : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{q.title}</h3>
                      <span className={`badge ${q.difficulty === 'hard' ? 'badge-red' : q.difficulty === 'medium' ? 'badge-yellow' : 'badge-green'}`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>{q.category}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 28 }}>
                <button
                  onClick={handleSubmit}
                  disabled={selectedIds.length < 3 || selectedIds.length > 5}
                  className="btn-primary"
                  style={{ padding: '13px 28px', fontSize: '0.9rem' }}
                >
                  Confirm Selection ({selectedIds.length}/5)
                </button>
              </div>
            </div>
          ) : (
            <div className="glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, textAlign: 'center' }}>
              <div className="spin" style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', marginBottom: 20 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Interviewer is selecting questions...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase: Selecting (Candidate picks 1)
  if (session.phase === 'selecting') {
    const proposedQuestions = questions.filter(q => session.proposedQIds.includes(q.id));

    return (
      <div style={{ minHeight: '100dvh', background: '#08080f', color: 'white', padding: '48px 24px' }}>
        <div className="bg-mesh" />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 className="fade-in-up" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8 }}>
            {isCandidate ? (
              <>Select Your <span className="text-gradient">Challenge</span></>
            ) : (
              <>Waiting for <span className="text-gradient">Candidate</span></>
            )}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: 36 }}>
            {isCandidate 
              ? 'Review the options below and select the one you feel most confident solving.' 
              : 'The candidate is reviewing your proposed questions and making a selection.'}
          </p>

          {isCandidate ? (
            <div>
              <div style={{ display: 'grid', gap: 16 }}>
                {proposedQuestions.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => toggleSelection(q.id)}
                    className="glass"
                    style={{
                      padding: 28,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: selectedIds.includes(q.id) 
                        ? '1px solid #10b981' 
                        : '1px solid var(--color-border)',
                      background: selectedIds.includes(q.id) 
                        ? 'rgba(16,185,129,0.1)' 
                        : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{q.title}</h3>
                      <span className={`badge ${q.difficulty === 'hard' ? 'badge-red' : q.difficulty === 'medium' ? 'badge-yellow' : 'badge-green'}`}>
                        {q.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{q.description}</p>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 28 }}>
                <button
                  onClick={handleSubmit}
                  disabled={selectedIds.length !== 1}
                  className="btn-primary"
                  style={{ padding: '15px 32px', fontSize: '1rem', background: 'linear-gradient(135deg, #059669, #10b981)' }}
                >
                  ✓ Start Coding
                </button>
              </div>
            </div>
          ) : (
            <div className="glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, textAlign: 'center' }}>
              <div className="spin" style={{ width: 48, height: 48, border: '3px solid rgba(16,185,129,0.3)', borderTopColor: '#10b981', borderRadius: '50%', marginBottom: 20 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Candidate is making a selection...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase: Finished
  if (session.phase === 'finished') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white', padding: 48 }}>
        <div className="bg-mesh" />
        <h1 className="text-gradient fade-in-up" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, marginBottom: 12, position: 'relative', zIndex: 1 }}>
          Interview Complete
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', position: 'relative', zIndex: 1 }}>Thank you for participating in the 1v1 Arena.</p>
      </div>
    );
  }

  // Fallback loading for coding phase (ArenaRoom handles this)
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white' }}>
      <div className="spin" style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', marginBottom: 20 }} />
      <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>Preparing coding environment...</p>
    </div>
  );
}
