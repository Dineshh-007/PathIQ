'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { CodingRoom, ClientToServerEvents, ServerToClientEvents } from '@peerprep/shared-types';
import { WebRTCProvider } from '../../../components/coding/WebRTCProvider';
import ArenaLobby from '../../../components/coding/ArenaLobby';
import ArenaRoom from '../../../components/coding/ArenaRoom';
import FeedbackScreen from '../../../components/coding/FeedbackScreen';
import { useAuthStore } from '../../../store/authStore';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

export default function ArenaClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [room, setRoom] = useState<CodingRoom | null>(null);
  const [error, setError] = useState('');

  // Guard: redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      query: { userId: user.id },
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
  }, [roomId, user]);

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
  };

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: '#f87171' }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', padding: 32, borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', maxWidth: 500, textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!room || !user) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Connecting to Arena...</p>
        </div>
      </div>
    );
  }

  const session = room.sessions?.[0];
  const isInterviewer = user.id === room.interviewerId;

  return (
    <WebRTCProvider socket={socket} userId={user.id}>
      {!session || session.phase === 'proposing' || session.phase === 'selecting' ? (
        <ArenaLobby
          room={room}
          userId={user.id}
          onProposeQuestions={handleProposeQuestions}
          onSelectQuestion={handleSelectQuestion}
          onJoinSession={() => {}}
        />
      ) : session.phase === 'coding' ? (
        <ArenaRoom
          room={room}
          userId={user.id}
          userName={user.name}
          onExecuteCode={handleExecuteCode}
          onFinishSession={() => socket?.emit('coding:end_session')} 
        />
      ) : (
        <FeedbackScreen
          isInterviewer={isInterviewer}
          onSubmitFeedback={handleSubmitFeedback}
          onExit={() => router.push('/dashboard')}
        />
      )}
    </WebRTCProvider>
  );
}
