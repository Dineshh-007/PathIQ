'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CodingRoom, ClientToServerEvents, ServerToClientEvents } from '@interview/shared-types';
import { WebRTCProvider } from '../../../components/coding/WebRTCProvider';
import ArenaLobby from '../../../components/coding/ArenaLobby';
import ArenaRoom from '../../../components/coding/ArenaRoom';
import FeedbackScreen from '../../../components/coding/FeedbackScreen';
import { useAuthStore } from '../../../store/useAuthStore'; // Assuming this exists
import { Loader2 } from 'lucide-react';
import axios from 'axios';

export default function ArenaClient({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [room, setRoom] = useState<CodingRoom | null>(null);
  const [error, setError] = useState('');
  
  // Replace with actual auth store usage
  // const user = useAuthStore(state => state.user);
  // For now, we mock the user based on local storage or hardcode for demo if not available.
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Quick mock for dev: grab from local storage or prompt
    let id = localStorage.getItem('userId');
    let name = localStorage.getItem('userName');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      name = 'Dev User ' + id.substring(5, 9);
      localStorage.setItem('userId', id);
      localStorage.setItem('userName', name);
    }
    setUserId(id);
    setUserName(name);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      query: { userId },
      withCredentials: true
    });

    newSocket.on('connect', () => {
      newSocket.emit('coding:join_room', { roomId });
    });

    newSocket.on('coding:room_state', (updatedRoom: CodingRoom) => {
      setRoom(updatedRoom);
    });

    newSocket.on('error', (msg) => {
      setError(msg);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, userId]);

  const handleProposeQuestions = (questionIds: string[]) => {
    socket?.emit('coding:propose_questions', { questionIds });
  };

  const handleSelectQuestion = (questionId: string) => {
    socket?.emit('coding:select_question', { questionId });
  };

  const handleExecuteCode = async (code: string, language: string) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/coding/execute`, {
        code,
        language
      });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  };

  const handleSubmitFeedback = (feedback: any) => {
    socket?.emit('coding:submit_feedback', feedback);
    // Optionally refetch room state or show completion
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111] text-red-400">
        <div className="bg-red-900/20 p-6 rounded-lg border border-red-900">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!room || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const session = room.sessions?.[0];
  const isInterviewer = userId === room.interviewerId;

  return (
    <WebRTCProvider socket={socket} userId={userId}>
      {!session || session.phase === 'proposing' || session.phase === 'selecting' ? (
        <ArenaLobby
          room={room}
          userId={userId}
          onProposeQuestions={handleProposeQuestions}
          onSelectQuestion={handleSelectQuestion}
          onJoinSession={() => {}}
        />
      ) : session.phase === 'coding' ? (
        <ArenaRoom
          room={room}
          userId={userId}
          userName={userName}
          onExecuteCode={handleExecuteCode}
          onFinishSession={() => socket?.emit('coding:end_session')} 
        />
      ) : (
        <FeedbackScreen
          isInterviewer={isInterviewer}
          onSubmitFeedback={handleSubmitFeedback}
          onExit={() => window.location.href = '/dashboard'}
        />
      )}
    </WebRTCProvider>
  );
}
