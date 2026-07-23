'use client';

import { useState, useEffect } from 'react';
import { CodingQuestion, CodingRoom, CodingSessionPhase } from '@peerprep/shared-types';
import axios from 'axios';
import { Play, Loader2, Check } from 'lucide-react';

interface ArenaLobbyProps {
  room: CodingRoom;
  userId: string;
  onProposeQuestions: (questionIds: string[]) => void;
  onSelectQuestion: (questionId: string) => void;
  onJoinSession: () => void;
}

export default function ArenaLobby({ room, userId, onProposeQuestions, onSelectQuestion, onJoinSession }: ArenaLobbyProps) {
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const isInterviewer = userId === room.interviewerId;
  const isCandidate = userId === room.candidateId;
  const session = room.sessions?.[0]; // Current active session if any

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/coding/questions`);
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
      setSelectedIds([id]); // Candidate only selects one
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
    return <div className="flex h-screen items-center justify-center bg-[#111111] text-white"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  // Phase: Proposing (Interviewer picks 3-5)
  if (!session || session.phase === 'proposing') {
    return (
      <div className="min-h-screen bg-[#111111] text-white p-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            {isInterviewer ? 'Select Questions for the Candidate' : 'Waiting for Interviewer'}
          </h1>
          <p className="text-gray-400 mb-8">
            {isInterviewer 
              ? 'Choose 3-5 questions. The candidate will then pick exactly 1 to solve.' 
              : 'The interviewer is currently selecting a pool of questions for you.'}
          </p>

          {isInterviewer ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => toggleSelection(q.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedIds.includes(q.id) 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{q.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                        q.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{q.category}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={selectedIds.length < 3 || selectedIds.length > 5}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  Confirm Selection ({selectedIds.length}/5)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 border border-gray-800 rounded-2xl bg-gray-900/30">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-xl font-medium text-gray-300">Interviewer is selecting questions...</p>
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
      <div className="min-h-screen bg-[#111111] text-white p-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
            {isCandidate ? 'Select Your Challenge' : 'Waiting for Candidate'}
          </h1>
          <p className="text-gray-400 mb-8">
            {isCandidate 
              ? 'Review the options below and select the one you feel most confident solving.' 
              : 'The candidate is reviewing your proposed questions and making a selection.'}
          </p>

          {isCandidate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {proposedQuestions.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => toggleSelection(q.id)}
                    className={`p-6 rounded-xl border cursor-pointer transition-all ${
                      selectedIds.includes(q.id) 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-xl">{q.title}</h3>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                        q.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {q.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm whitespace-pre-wrap">{q.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={selectedIds.length !== 1}
                  className="px-8 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-2 text-lg"
                >
                  <Check className="w-5 h-5" /> Start Coding
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 border border-gray-800 rounded-2xl bg-gray-900/30">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
              <p className="text-xl font-medium text-gray-300">Candidate is making a selection...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase: Finished
  if (session.phase === 'finished') {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-12">
        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Interview Complete
        </h1>
        <p className="text-gray-400 text-lg">Thank you for participating in the 1v1 Arena.</p>
      </div>
    );
  }

  // Phase: Coding
  // Should never render this as ArenaRoom will take over, but just in case:
  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-12">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-xl">Preparing coding environment...</p>
      {setTimeout(onJoinSession, 1000) && ''}
    </div>
  );
}
