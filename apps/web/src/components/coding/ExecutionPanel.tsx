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
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-gray-700 rounded-lg overflow-hidden text-gray-300">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-[#252526]">
        <div className="text-sm font-semibold uppercase tracking-wider text-gray-400">Terminal</div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Code
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 font-mono text-sm whitespace-pre-wrap">
        {!result && !isRunning && (
          <div className="text-gray-500 italic">Output will appear here after execution...</div>
        )}
        
        {isRunning && (
          <div className="text-blue-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Executing in secure sandbox...
          </div>
        )}

        {result?.error && (
          <div className="text-red-400 mt-2">
            <div className="flex items-center gap-2 font-bold mb-1"><AlertCircle className="w-4 h-4"/> Error:</div>
            {result.error}
          </div>
        )}
        
        {result?.output && (
          <div className="text-green-400 mt-2">
            <div className="flex items-center gap-2 font-bold mb-1"><CheckCircle2 className="w-4 h-4"/> Output:</div>
            {result.output}
          </div>
        )}
      </div>
    </div>
  );
}
