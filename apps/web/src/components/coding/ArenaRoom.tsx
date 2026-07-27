'use client';

import { useState } from 'react';
import CodeEditor from './CodeEditor';
import ExecutionPanel from './ExecutionPanel';
import VideoOverlay from './VideoOverlay';
import { CodingRoom, CodingQuestion } from '@peerprep/shared-types';

interface ArenaRoomProps {
  room: CodingRoom;
  userId: string;
  userName: string;
  onExecuteCode: (code: string, language: string) => Promise<{ output: string; error?: string }>;
  onFinishSession: () => void;
}

export default function ArenaRoom({ room, userId, userName, onExecuteCode, onFinishSession }: ArenaRoomProps) {
  const session = room.sessions?.[0];
  const question = (session as any)?.question as CodingQuestion | undefined; // The populated question
  const isInterviewer = userId === room.interviewerId;

  const [code, setCode] = useState(session?.codeSnapshot || '');
  const [language, setLanguage] = useState(session?.language || 'javascript');

  const partnerName = isInterviewer 
    ? (room as any).candidate?.name || 'Candidate' 
    : (room as any).interviewer?.name || 'Interviewer';

  const descriptionText = question?.description || 'Loading challenge description...';

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#08080f', color: '#e2e8f0', overflow: 'hidden', fontFamily: 'var(--font-sans, sans-serif)' }}>
      
      {/* Left Sidebar: Problem Description */}
      <div style={{ width: '32%', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,15,25,0.6)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(20,20,35,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            {question?.title || 'Coding Challenge'}
          </h2>
          {isInterviewer && (
            <button 
              onClick={onFinishSession}
              style={{
                padding: '6px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              End Session
            </button>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
            <span className={`badge ${
              question?.difficulty === 'easy' ? 'badge-green' :
              question?.difficulty === 'medium' ? 'badge-yellow' : 'badge-red'
            }`}>
              {(question?.difficulty || 'medium').toUpperCase()}
            </span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {question?.category || 'Algorithm'}
            </span>
          </div>

          <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--color-text)' }}>
            {descriptionText.split('\n').map((para, i) => (
              <p key={i} style={{ marginBottom: 16 }}>{para}</p>
            ))}
          </div>

          {question?.testCases && question.testCases.filter(tc => !tc.hidden).length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, marginBottom: 16 }}>
                Examples
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {question.testCases.filter(tc => !tc.hidden).map((tc, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: 6 }}><span style={{ color: 'var(--color-text-subtle)', userSelect: 'none' }}>Input: </span><span style={{ color: '#60a5fa' }}>{tc.input}</span></div>
                    <div><span style={{ color: 'var(--color-text-subtle)', userSelect: 'none' }}>Output: </span><span style={{ color: '#34d399' }}>{tc.output}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace: Editor and Terminal */}
      <div style={{ width: '68%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Editor Header */}
        <div style={{ height: 48, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18,18,28,0.9)', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, fontSize: '0.85rem', padding: '4px 10px', color: '#e2e8f0', outline: 'none', cursor: 'pointer' }}
            >
              <option value="javascript" style={{ background: '#111' }}>JavaScript (Node.js)</option>
              <option value="python" style={{ background: '#111' }}>Python 3</option>
              <option value="java" style={{ background: '#111' }}>Java</option>
              <option value="cpp" style={{ background: '#111' }}>C++</option>
            </select>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} /> Live Collaboration
          </div>
        </div>

        {/* Resizable vertical split for Editor and Terminal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 3, position: 'relative', minHeight: 0 }}>
            <CodeEditor
              roomId={room.id}
              userId={userId}
              userName={userName}
              userColor={isInterviewer ? '#3b82f6' : '#10b981'}
              language={language}
              onCodeChange={setCode}
            />
          </div>
          <div style={{ flex: 1, minHeight: 180, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <ExecutionPanel
              code={code}
              language={language}
              onExecute={onExecuteCode}
            />
          </div>
        </div>
      </div>

      {/* Floating Video Overlay */}
      <VideoOverlay partnerName={partnerName} />
    </div>
  );
}
