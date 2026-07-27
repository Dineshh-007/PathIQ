'use client';

import { useState } from 'react';

interface FeedbackScreenProps {
  isInterviewer: boolean;
  onSubmitFeedback: (feedback: {
    technicalScore: number;
    problemSolving: number;
    communication: number;
    codeQuality: number;
    writtenFeedback: string;
  }) => void;
  onExit: () => void;
}

export default function FeedbackScreen({ isInterviewer, onSubmitFeedback, onExit }: FeedbackScreenProps) {
  const [scores, setScores] = useState({
    technicalScore: 0,
    problemSolving: 0,
    communication: 0,
    codeQuality: 0,
  });
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isInterviewer) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white', padding: 48 }}>
        <div className="bg-mesh" />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h1 className="text-gradient fade-in-up" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, marginBottom: 12 }}>
            Interview Completed!
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: 32, maxWidth: 500 }}>
            You have successfully completed the Live Coding Arena challenge. Your interviewer is currently submitting their feedback.
          </p>
          <button onClick={onExit} className="btn-ghost" style={{ padding: '12px 28px', fontSize: '0.9rem' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleStarClick = (category: keyof typeof scores, rating: number) => {
    setScores(prev => ({ ...prev, [category]: rating }));
  };

  const handleSubmit = () => {
    onSubmitFeedback({
      ...scores,
      writtenFeedback,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white', padding: 48 }}>
        <div className="bg-mesh" />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <h1 className="fade-in-up" style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>Feedback Submitted</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: 32 }}>Thank you for evaluating the candidate.</p>
          <button onClick={onExit} className="btn-primary" style={{ padding: '13px 32px', fontSize: '0.9rem' }}>
            Close Session
          </button>
        </div>
      </div>
    );
  }

  const categories = [
    { key: 'technicalScore', label: 'Technical Execution', desc: 'Correctness and efficiency of the code', icon: '💻' },
    { key: 'problemSolving', label: 'Problem Solving', desc: 'Approach, algorithms, and handling edge cases', icon: '🧠' },
    { key: 'communication', label: 'Communication', desc: 'Clarity in explaining thought process', icon: '🗣️' },
    { key: 'codeQuality', label: 'Code Quality', desc: 'Cleanliness, readability, and naming conventions', icon: '✨' },
  ] as const;

  const allRated = Object.values(scores).every(s => s > 0);

  return (
    <div style={{ minHeight: '100dvh', background: '#08080f', color: 'white', padding: '48px 24px', overflow: 'auto' }}>
      <div className="bg-mesh" />
      <div className="glass fade-in-up" style={{ maxWidth: 700, margin: '0 auto', padding: 40, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 6, letterSpacing: '-0.03em' }}>Evaluate Candidate</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--color-border)' }}>
          Please provide constructive feedback for the candidate&apos;s performance in the Live Coding Arena.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 36 }}>
          {categories.map(({ key, label, desc, icon }) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 2 }}>{icon} {label}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>{desc}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(key, star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 28,
                      transition: 'transform 0.15s',
                      filter: scores[key] >= star ? 'none' : 'grayscale(1) opacity(0.3)',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 32 }}>
          <label className="label">Written Feedback</label>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)', marginBottom: 10 }}>
            Provide detailed notes on strengths and areas for improvement.
          </p>
          <textarea
            value={writtenFeedback}
            onChange={(e) => setWrittenFeedback(e.target.value)}
            className="input"
            style={{ width: '100%', height: 140, resize: 'none' }}
            placeholder="The candidate did a great job explaining their approach..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleSubmit}
            disabled={!allRated}
            className="btn-primary"
            style={{ padding: '13px 32px', fontSize: '0.9rem' }}
          >
            Submit Evaluation
          </button>
        </div>
      </div>
    </div>
  );
}
