'use client';
import { useState, useEffect } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';
import type { InterviewRole, Question, EvaluationReveal } from '@peerprep/shared-types';
import CountdownTimer from '@/components/common/CountdownTimer';

const ROLES: { value: InterviewRole; label: string; icon: string }[] = [
  { value: 'software_engineer', label: 'Software Engineer', icon: '💻' },
  { value: 'ai_engineer', label: 'AI Engineer', icon: '🧠' },
  { value: 'data_analyst', label: 'Data Analyst', icon: '📊' },
  { value: 'web_developer', label: 'Web Developer', icon: '🌐' },
  { value: 'cybersecurity_engineer', label: 'Cybersecurity Engineer', icon: '🔐' },
  { value: 'devops_engineer', label: 'DevOps Engineer', icon: '⚙️' },
];

const DIFF_COLOR: Record<string, string> = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };

export default function InterviewPanel() {
  const { session, latestReveal, room } = useRoomStore();
  const { user } = useAuthStore();
  const socket = getSocket();

  const [selectedRole, setSelectedRole] = useState<InterviewRole | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [myScore, setMyScore] = useState<number>(5);
  const [myFeedback, setMyFeedback] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [evalSubmitted, setEvalSubmitted] = useState(false);
  const [evalProgress, setEvalProgress] = useState({ submitted: 0, total: 4 });
  const [currentPhase, setCurrentPhase] = useState(session?.phase ?? 'role_selection');
  const [answering, setAnswering] = useState(false);
  const [timerEndsAt, setTimerEndsAt] = useState<string | null>(null);
  // Bug fix: separate timer anchor for the voting phase, driven by the
  // server-issued timerEndsAt so all clients (including reconnecting ones)
  // see the same countdown instead of a client-local static 60 s.
  const [votingTimerEndsAt, setVotingTimerEndsAt] = useState<string | null>(null);
  const [timerDuration, setTimerDuration] = useState(180);
  const [leadInterviewerId, setLeadInterviewerId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [showReveal, setShowReveal] = useState(false);

  const isInterviewee = session?.intervieweeId === user?.id;

  useEffect(() => {
    const s = getSocket();

    const onVotingStart = (sess: any) => {
      setCurrentPhase('voting');
      setMyVote(null);
      setSelectedQuestion(null);
      setEvalSubmitted(false);
      setShowReveal(false);
      setVotingTimerEndsAt(sess?.timerEndsAt ?? null);
      useRoomStore.getState().setSession(sess); // Ensure session is updated
    };
    const onVoteCast = ({ userId, voteCount }: any) => {
      useRoomStore.getState().updateVoteCount(userId, voteCount);
      setVoteCount(voteCount);
    };
    const onQuestionSelected = (q: Question) => setSelectedQuestion(q);
    const onAnswerStart = ({ timerEndsAt: tAt, leadInterviewerUserId }: any) => {
      setCurrentPhase('answering');
      setAnswering(true);
      setTimerEndsAt(tAt);
      setLeadInterviewerId(leadInterviewerUserId);
      setTimerDuration(room ? 180 : 180);
      setMyAnswer('');
    };
    const onAnswerEnd = () => setAnswering(false);
    const onEvaluationStart = (data?: { answerText?: string }) => {
      setCurrentPhase('evaluating');
      setEvalSubmitted(false);
      setMyScore(5);
      setMyFeedback('');
      if (data?.answerText) {
        setSelectedQuestion((prev) => prev ? { ...prev, answerText: data.answerText } as any : null);
      }
    };
    const onEvaluationProgress = ({ submitted, total }: any) => setEvalProgress({ submitted, total });
    const onScoresRevealed = () => {
      setCurrentPhase('reveal');
      setShowReveal(true);
    };
    const onRotation = () => { setCurrentPhase('role_selection'); setSelectedRole(null); setMyAnswer(''); };
    const onSessionStart = (sess: any) => { setCurrentPhase('role_selection'); setSelectedRole(null); setMyAnswer(''); };
    const onReconnectSync = (sess: any) => {
      setCurrentPhase(sess.phase);
      if (sess.phase === 'voting') {
        setVotingTimerEndsAt(sess.timerEndsAt ?? null);
      } else if (sess.phase === 'answering') {
        setTimerEndsAt(sess.timerEndsAt ?? null);
        setAnswering(true);
        if (sess.selectedQuestion) setSelectedQuestion(sess.selectedQuestion);
      } else if (sess.phase === 'evaluating') {
        if (sess.selectedQuestion) setSelectedQuestion(sess.selectedQuestion);
      }
    };

    s.on('interview:voting_start', onVotingStart);
    s.on('interview:vote_cast', onVoteCast);
    s.on('interview:question_selected', onQuestionSelected);
    s.on('interview:answer_start', onAnswerStart);
    s.on('interview:answer_end', onAnswerEnd);
    s.on('interview:evaluation_start', onEvaluationStart);
    s.on('interview:evaluation_progress', onEvaluationProgress);
    s.on('interview:scores_revealed', onScoresRevealed);
    s.on('interview:rotation', onRotation);
    s.on('interview:session_start', onSessionStart);
    s.on('interview:reconnect_sync', onReconnectSync);

    return () => {
      s.off('interview:voting_start', onVotingStart);
      s.off('interview:vote_cast', onVoteCast);
      s.off('interview:question_selected', onQuestionSelected);
      s.off('interview:answer_start', onAnswerStart);
      s.off('interview:answer_end', onAnswerEnd);
      s.off('interview:evaluation_start', onEvaluationStart);
      s.off('interview:evaluation_progress', onEvaluationProgress);
      s.off('interview:scores_revealed', onScoresRevealed);
      s.off('interview:rotation', onRotation);
      s.off('interview:session_start', onSessionStart);
      s.off('interview:reconnect_sync', onReconnectSync);
    };
  }, [room]);

  const handleSelectRole = (role: InterviewRole) => {
    setSelectedRole(role);
    socket.emit('interview:select_role', { role });
  };

  const handleVote = (qId: string) => {
    setMyVote(qId);
    socket.emit('interview:vote', { questionId: qId });
  };

  const handleAnswerDone = () => {
    socket.emit('interview:answer_done', { answerText: myAnswer });
    setAnswering(false);
  };

  const handleSubmitEval = (sqId: string) => {
    socket.emit('evaluation:submit', { sessionQuestionId: sqId, score: myScore, feedback: myFeedback });
    setEvalSubmitted(true);
  };

  // ── Role Selection Phase ──────────────────────────────────────────────────
  if (currentPhase === 'role_selection') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 600 }}>
          <InterviewHeader session={session} user={user} />
          {isInterviewee ? (
            <div className="glass fade-in-up" style={{ padding: 36, marginTop: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>Select Your Interview Role</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 28 }}>Interviewers will be shown 5 curated questions for your chosen role.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {ROLES.map((role) => (
                  <button key={role.value} id={`role-${role.value}`} onClick={() => handleSelectRole(role.value)}
                    style={{ padding: '16px 14px', borderRadius: 12, background: selectedRole === role.value ? 'rgba(124,58,237,0.25)' : 'var(--color-surface-2)', border: `1px solid ${selectedRole === role.value ? 'rgba(124,58,237,0.6)' : 'var(--color-border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { if (selectedRole !== role.value) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.4)'; }}
                    onMouseLeave={(e) => { if (selectedRole !== role.value) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; }}>
                    <span style={{ fontSize: 24 }}>{role.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text)', textAlign: 'left' }}>{role.label}</span>
                  </button>
                ))}
              </div>
              {selectedRole && (
                <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', fontSize: '0.82rem', color: '#a78bfa', textAlign: 'center' }}>
                  ⏳ Waiting for voting to begin...
                </div>
              )}
            </div>
          ) : (
            <div className="glass fade-in-up" style={{ padding: 36, marginTop: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{session?.intervieweeName} is selecting their role...</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Questions will appear once they choose.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Voting Phase ──────────────────────────────────────────────────────────
  if (currentPhase === 'voting') {
    const questions = session?.candidateQuestions ?? [];
    console.log('[DEBUG-CLIENT] Render voting phase. Questions length:', questions.length, 'session:', session);
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 680 }}>
          <InterviewHeader session={session} user={user} />
          <div className="glass fade-in-up" style={{ padding: 32, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4 }}>🗳️ Vote for a Question</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  {isInterviewee ? 'Interviewers are voting. You cannot see which question they choose.' : 'Select the question you want to ask. Highest votes wins.'}
                </p>
              </div>
              <CountdownTimer endsAt={votingTimerEndsAt} durationSecs={60} size={72} label="Voting" />
            </div>

            {!isInterviewee ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {questions.map((q, i) => (
                    <button key={q.id} id={`vote-q-${i}`} onClick={() => handleVote(q.id)}
                      style={{ padding: '16px 20px', borderRadius: 12, background: myVote === q.id ? 'rgba(124,58,237,0.2)' : 'var(--color-surface-2)', border: `2px solid ${myVote === q.id ? 'rgba(124,58,237,0.6)' : 'var(--color-border)'}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                      onMouseEnter={(e) => { if (myVote !== q.id) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.35)'; }}
                      onMouseLeave={(e) => { if (myVote !== q.id) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: myVote === q.id ? 'rgba(124,58,237,0.4)' : 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, flexShrink: 0, color: myVote === q.id ? '#a78bfa' : 'var(--color-text-muted)' }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>{q.text}</p>
                        <span style={{ fontSize: '0.7rem', color: DIFF_COLOR[q.difficulty], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6, display: 'block' }}>{q.difficulty}</span>
                      </div>
                      {myVote === q.id && <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  <div className="progress-bar" style={{ flex: 1 }}><div className="progress-bar-fill" style={{ width: `${(voteCount / 4) * 100}%` }} /></div>
                  <span>{voteCount}/4 votes cast</span>
                </div>
              </>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Your interviewers are selecting a question for you. Stand by...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Answering Phase ───────────────────────────────────────────────────────
  if (currentPhase === 'answering') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <InterviewHeader session={session} user={user} />
          <div className="glass fade-in-up" style={{ padding: 36, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
              <CountdownTimer endsAt={timerEndsAt} durationSecs={timerDuration} size={96} label="Answer Time" onExpire={() => { if (isInterviewee) handleAnswerDone(); }} />
              <div>
                <div className="badge badge-purple" style={{ marginBottom: 8 }}>
                  Question {session?.questionNumber} of {room ? 2 : 2}
                </div>
                {leadInterviewerId && leadInterviewerId !== user?.id && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
                    {leadInterviewerId === user?.id ? '🎤 You are the Lead Interviewer' : '🎤 Lead Interviewer is reading the question'}
                  </p>
                )}
              </div>
            </div>

            {selectedQuestion && (
              <div className="glow-border" style={{ padding: '20px 24px', borderRadius: 14, marginBottom: 24, background: 'rgba(124,58,237,0.06)' }}>
                <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text)', margin: 0 }}>{selectedQuestion.text}</p>
                <span style={{ fontSize: '0.72rem', color: DIFF_COLOR[selectedQuestion.difficulty], fontWeight: 700, textTransform: 'uppercase', marginTop: 8, display: 'block' }}>{selectedQuestion.difficulty}</span>
              </div>
            )}

            {isInterviewee ? (
              <div>
                <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 16, fontSize: '0.85rem', color: '#34d399' }}>
                  🎤 You are the interviewee. Type your answer clearly and concisely below.
                </div>
                <textarea id="answer-input" className="input" rows={6} placeholder="Type your answer here..." value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, marginBottom: 18 }} />
                <button className="btn-primary" onClick={handleAnswerDone} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: '100%', padding: '13px' }}>
                  ✓ Submit Final Answer
                </button>
              </div>
            ) : (
              <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', fontSize: '0.85rem', color: '#818cf8' }}>
                👂 Listen carefully. You will evaluate this answer next.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Evaluation Phase ──────────────────────────────────────────────────────
  if (currentPhase === 'evaluating') {
    const activeQuestion = selectedQuestion || session?.selectedQuestion;
    const sqId = activeQuestion?.id ?? '';
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 540 }}>
          <InterviewHeader session={session} user={user} />
          <div className="glass fade-in-up" style={{ padding: 36, marginTop: 20 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>🔒 Private Evaluation</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: 24 }}>
              {isInterviewee ? 'Your interviewers are privately evaluating your answer.' : 'Score the candidate\'s answer below privately. No one can see your score until everyone submits.'}
            </p>

            {/* Display the Candidate's Answer */}
            {activeQuestion && (
              <div className="glow-border" style={{ padding: '20px 24px', borderRadius: 14, marginBottom: 24, background: 'rgba(124,58,237,0.06)' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>Question:</p>
                <p style={{ fontSize: '1rem', lineHeight: 1.6, color: 'var(--color-text)', margin: '0 0 16px 0' }}>{activeQuestion.text}</p>
                
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', marginBottom: 8 }}>Candidate's Answer:</p>
                <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {(activeQuestion as any).answerText || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No written answer provided.</span>}
                  </p>
                </div>
              </div>
            )}

            {isInterviewee ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <div className="spin" style={{ width: 36, height: 36, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Evaluators: {evalProgress.submitted}/{evalProgress.total} submitted</p>
              </div>
            ) : evalSubmitted ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Evaluation Submitted!</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>Waiting for others...</p>
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${(evalProgress.submitted / evalProgress.total) * 100}%` }} /></div>
                <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>{evalProgress.submitted}/{evalProgress.total} evaluators done</p>
              </div>
            ) : (
              <>
                {/* Score Slider */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <label className="label">Score</label>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: myScore >= 7 ? '#10b981' : myScore >= 4 ? '#f59e0b' : '#ef4444', transition: 'color 0.3s' }}>
                      {myScore}<span style={{ fontSize: '1rem', color: 'var(--color-text-subtle)', fontWeight: 400 }}>/10</span>
                    </div>
                  </div>
                  <input id="score-slider" type="range" min={1} max={10} value={myScore} onChange={(e) => setMyScore(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: myScore >= 7 ? '#10b981' : myScore >= 4 ? '#f59e0b' : '#ef4444', height: 6, cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: 6 }}>
                    <span>1 — Poor</span><span>5 — Average</span><span>10 — Excellent</span>
                  </div>
                </div>

                {/* Feedback */}
                <div style={{ marginBottom: 24 }}>
                  <label className="label">Written Feedback <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--color-text-subtle)' }}>(optional)</span></label>
                  <textarea id="eval-feedback" className="input" rows={4} placeholder="What did they do well? What could be improved? Be specific." value={myFeedback} onChange={(e) => setMyFeedback(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
                </div>

                <button id="submit-eval-btn" className="btn-primary" onClick={() => handleSubmitEval(sqId)} style={{ width: '100%', padding: '13px' }}>
                  🔒 Submit Evaluation
                </button>
                <p style={{ marginTop: 12, fontSize: '0.74rem', color: 'var(--color-text-subtle)', textAlign: 'center' }}>
                  Your score is sealed until all {evalProgress.total} evaluators submit.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Score Reveal Phase ────────────────────────────────────────────────────
  if (currentPhase === 'reveal' && latestReveal) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 600 }}>
          <InterviewHeader session={session} user={user} />
          <div className="glass fade-in-up scale-in" style={{ padding: 36, marginTop: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <h2 style={{ fontWeight: 900, fontSize: '1.3rem', marginBottom: 4 }}>Scores Revealed!</h2>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: latestReveal.averageScore >= 7 ? '#10b981' : latestReveal.averageScore >= 4 ? '#f59e0b' : '#ef4444' }}>
                {latestReveal.averageScore.toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>/10 avg</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {latestReveal.evaluations.map((e, i) => (
                <div key={e.evaluatorId} className="fade-in-up" style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', animationDelay: `${i * 0.1}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: e.feedback ? 8 : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{e.evaluatorName}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: e.score >= 7 ? '#10b981' : e.score >= 4 ? '#f59e0b' : '#ef4444' }}>{e.score}/10</span>
                  </div>
                  {e.feedback && <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>&ldquo;{e.feedback}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-mesh" />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Loading interview session...</p>
      </div>
    </div>
  );
}

function InterviewHeader({ session, user }: { session: any; user: any }) {
  const isInterviewee = session?.intervieweeId === user?.id;
  return (
    <div className="glass-dark" style={{ padding: '16px 24px', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 8px #7c3aed', animation: 'pulse-glow 2s infinite' }} />
        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
          Round {session?.roundNumber ?? '?'} · Question {session?.questionNumber ?? 1}/2
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="badge" style={{ background: isInterviewee ? 'rgba(124,58,237,0.2)' : 'rgba(99,102,241,0.15)', color: isInterviewee ? '#a78bfa' : '#818cf8', border: `1px solid ${isInterviewee ? 'rgba(124,58,237,0.3)' : 'rgba(99,102,241,0.25)'}` }}>
          {isInterviewee ? '🎤 You\'re on the hot seat' : `👁 ${session?.intervieweeName} is being interviewed`}
        </div>
      </div>
    </div>
  );
}
