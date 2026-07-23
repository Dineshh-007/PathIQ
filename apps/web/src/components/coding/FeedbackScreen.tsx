'use client';

import { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111] text-white p-12">
        <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
          Interview Completed!
        </h1>
        <p className="text-gray-400 text-lg mb-8 text-center max-w-lg">
          You have successfully completed the Live Coding Arena challenge. Your interviewer is currently submitting their feedback.
        </p>
        <button
          onClick={onExit}
          className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          Return to Dashboard
        </button>
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111] text-white p-12">
        <CheckCircle2 className="w-20 h-20 text-blue-500 mb-6" />
        <h1 className="text-4xl font-bold mb-4">Feedback Submitted</h1>
        <p className="text-gray-400 text-lg mb-8">Thank you for evaluating the candidate.</p>
        <button
          onClick={onExit}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all"
        >
          Close Session
        </button>
      </div>
    );
  }

  const categories = [
    { key: 'technicalScore', label: 'Technical Execution', desc: 'Correctness and efficiency of the code' },
    { key: 'problemSolving', label: 'Problem Solving', desc: 'Approach, algorithms, and handling edge cases' },
    { key: 'communication', label: 'Communication', desc: 'Clarity in explaining thought process' },
    { key: 'codeQuality', label: 'Code Quality', desc: 'Cleanliness, readability, and naming conventions' },
  ] as const;

  const allRated = Object.values(scores).every(s => s > 0);

  return (
    <div className="min-h-screen bg-[#111111] text-white p-12 overflow-auto">
      <div className="max-w-3xl mx-auto bg-gray-900/50 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">Evaluate Candidate</h1>
        <p className="text-gray-400 mb-8 pb-6 border-b border-gray-800">Please provide constructive feedback for the candidate's performance in the Live Coding Arena.</p>

        <div className="space-y-8 mb-10">
          {categories.map(({ key, label, desc }) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-200">{label}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(key, star)}
                    className="focus:outline-none transform transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-8 h-8 ${scores[key] >= star ? 'fill-yellow-500 text-yellow-500' : 'text-gray-700'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <label className="block text-lg font-medium text-gray-200 mb-2">Written Feedback</label>
          <p className="text-sm text-gray-500 mb-4">Provide detailed notes on strengths and areas for improvement.</p>
          <textarea
            value={writtenFeedback}
            onChange={(e) => setWrittenFeedback(e.target.value)}
            className="w-full h-40 bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            placeholder="The candidate did a great job explaining their approach..."
          />
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-800">
          <button
            onClick={handleSubmit}
            disabled={!allRated}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all"
          >
            Submit Evaluation
          </button>
        </div>
      </div>
    </div>
  );
}
