'use client';

import { useState } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExecutionPanelProps {
  code: string;
  language: string;
  onExecute?: (code: string, language: string) => Promise<{ output: string; error?: string }>;
}

export default function ExecutionPanel({ code, language, onExecute }: ExecutionPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ output: string; error?: string } | null>(null);

  const handleRun = async () => {
    if (!onExecute) return;
    setIsRunning(true);
    setResult(null);
    try {
      const res = await onExecute(code, language);
      setResult(res);
    } catch (err: any) {
      setResult({ output: '', error: err.message || 'Execution failed' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(15,15,25,0.9)', color: '#e2e8f0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(20,20,35,0.8)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-subtle)' }}>
          Terminal Output
        </div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 18px',
            background: isRunning ? 'rgba(16,185,129,0.5)' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
          }}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Code
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
        {!result && !isRunning && (
          <div style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>Output will appear here after execution...</div>
        )}
        
        {isRunning && (
          <div style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Executing in secure sandbox...
          </div>
        )}

        {result?.error && (
          <div style={{ color: '#f87171', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 6 }}><AlertCircle className="w-4 h-4"/> Error:</div>
            <div style={{ background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{result.error}</div>
          </div>
        )}
        
        {result?.output && (
          <div style={{ color: '#34d399', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 6 }}><CheckCircle2 className="w-4 h-4"/> Output:</div>
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>{result.output}</div>
          </div>
        )}
      </div>
    </div>
  );
}
