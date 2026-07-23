'use client';

import { useState } from 'react';
import CodeEditor from './CodeEditor';
import ExecutionPanel from './ExecutionPanel';
import VideoOverlay from './VideoOverlay';
import { CodingRoom, CodingQuestion, CodingSession } from '@interview/shared-types';

interface ArenaRoomProps {
  room: CodingRoom;
  userId: string;
  userName: string;
  onExecuteCode: (code: string, language: string) => Promise<{ output: string; error?: string }>;
  onFinishSession: () => void;
}

export default function ArenaRoom({ room, userId, userName, onExecuteCode, onFinishSession }: ArenaRoomProps) {
  const session = room.sessions?.[0];
  const question = session?.question as unknown as CodingQuestion; // The populated question
  const isInterviewer = userId === room.interviewerId;

  const [code, setCode] = useState(session?.codeSnapshot || '');
  const [language, setLanguage] = useState(session?.language || 'javascript');

  const partnerName = isInterviewer 
    ? (room as any).candidate?.name || 'Candidate' 
    : (room as any).interviewer?.name || 'Interviewer';

  return (
    <div className="flex h-screen bg-[#111111] text-gray-200 overflow-hidden font-sans">
      
      {/* Left Sidebar: Problem Description */}
      <div className="w-[30%] flex flex-col border-r border-gray-800 bg-[#1a1a1a]">
        <div className="p-4 border-b border-gray-800 bg-[#222222] flex items-center justify-between">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            {question?.title || 'Coding Challenge'}
          </h2>
          {isInterviewer && (
            <button 
              onClick={onFinishSession}
              className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 border border-red-600/50 rounded-md text-sm font-medium transition-colors"
            >
              End Session
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex gap-2">
            <span className={`text-xs px-2 py-1 rounded border ${
              question?.difficulty === 'easy' ? 'bg-green-900/30 border-green-700 text-green-400' :
              question?.difficulty === 'medium' ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400' :
              'bg-red-900/30 border-red-700 text-red-400'
            }`}>
              {question?.difficulty || 'Medium'}
            </span>
            <span className="text-xs px-2 py-1 rounded border bg-gray-800 border-gray-700 text-gray-400">
              {question?.category || 'Algorithm'}
            </span>
          </div>

          <div className="prose prose-invert prose-sm max-w-none">
            {question?.description.split('\n').map((para, i) => (
              <p key={i} className="mb-4 text-gray-300 leading-relaxed">{para}</p>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="font-semibold text-gray-400 uppercase tracking-wider text-sm border-b border-gray-800 pb-2">Examples</h3>
            {question?.testCases?.filter(tc => !tc.hidden).map((tc, i) => (
              <div key={i} className="bg-black/40 border border-gray-800 rounded-lg p-4 font-mono text-sm">
                <div className="mb-2"><span className="text-gray-500 select-none">Input: </span><span className="text-blue-300">{tc.input}</span></div>
                <div><span className="text-gray-500 select-none">Output: </span><span className="text-green-300">{tc.output}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace: Editor and Terminal */}
      <div className="w-[70%] flex flex-col h-full">
        {/* Editor Header */}
        <div className="h-12 border-b border-gray-800 bg-[#1e1e1e] flex items-center px-4 justify-between">
          <div className="flex items-center gap-4">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#2d2d2d] border border-gray-700 rounded text-sm px-2 py-1 text-gray-300 outline-none focus:border-blue-500"
            >
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="python">Python 3</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
          </div>
        </div>

        {/* Resizable vertical split for Editor and Terminal */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-[3] relative">
            <CodeEditor
              roomId={room.id}
              userId={userId}
              userName={userName}
              userColor={isInterviewer ? '#3b82f6' : '#10b981'} // Blue for interviewer, Green for candidate
              language={language}
              onCodeChange={setCode}
            />
          </div>
          <div className="flex-[1] min-h-0 border-t border-gray-800">
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
