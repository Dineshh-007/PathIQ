'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Socket } from 'socket.io-client';
import { CodingRoom, ClientToServerEvents, ServerToClientEvents } from '@peerprep/shared-types';
import { WebRTCProvider } from '@/components/coding/WebRTCProvider';
import ArenaLobby from '@/components/coding/ArenaLobby';
import ArenaRoom from '@/components/coding/ArenaRoom';
import FeedbackScreen from '@/components/coding/FeedbackScreen';
import { useAuthStore } from '@/store/authStore';
import { api, arenaApi } from '@/services/api';
import { connectSocket } from '@/services/socket';

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

    let isMounted = true;

    const initArena = async () => {
      try {
        const { data } = await arenaApi.get(roomId);
        if (!isMounted) return;
        setRoom(data.room);
        setError('');

        const s = connectSocket({ userId: user.id });

        const onConnect = () => {
          s.emit('coding:join_room', { roomId, userId: user.id, token: useAuthStore.getState().accessToken || undefined });
        };

        const onRoomState = (updatedRoom: CodingRoom) => {
          if (isMounted) {
            setRoom(updatedRoom);
            setError('');
          }
        };

        const onError = (msg: string) => {
          if (isMounted) setError(msg);
        };

        const onConnectError = (err: any) => {
          console.error('Socket connection error:', err);
          if (isMounted) {
            setError('Failed to connect to real-time server. Please check your internet connection or try refreshing.');
          }
        };

        s.on('connect', onConnect);
        s.on('coding:room_state', onRoomState);
        s.on('error', onError);
        s.on('connect_error', onConnectError);

        if (s.connected) {
          onConnect();
        }

        if (isMounted) {
          setSocket(s);
        }
      } catch (err: any) {
        console.error('Error initializing arena room via API:', err);
        if (isMounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load coding room');
        }
      }
    };

    initArena();

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('connect');
        socket.off('coding:room_state');
        socket.off('error');
        socket.off('connect_error');
      }
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
      const res = await api.post('/coding/execute', { code, language });
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
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white', padding: 24 }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', padding: 36, borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12, color: '#f87171' }}>Arena Notice</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: 28, lineHeight: 1.6 }}>{error}</p>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="btn-primary" 
            style={{ padding: '12px 28px', fontSize: '0.9rem', width: '100%' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!room || !user) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080f', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin" style={{ width: 44, height: 44, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', fontWeight: 500 }}>Connecting to Arena...</p>
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
