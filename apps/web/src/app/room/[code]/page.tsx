'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket';
import type { Room, Participant, InterviewSession, EvaluationReveal, RoomResults, AwardCategory } from '@peerprep/shared-types';
import LobbyPanel from '@/components/room/LobbyPanel';
import InterviewPanel from '@/components/room/InterviewPanel';
import ResultsPanel from '@/components/room/ResultsPanel';
import AwardsPanel from '@/components/room/AwardsPanel';
import NotificationToast from '@/components/common/NotificationToast';

const ROLE_LABELS: Record<string, string> = {
  software_engineer: 'Software Engineer',
  ai_engineer: 'AI Engineer',
  data_analyst: 'Data Analyst',
  web_developer: 'Web Developer',
  cybersecurity_engineer: 'Cybersecurity Engineer',
  devops_engineer: 'DevOps Engineer',
};

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { room, phase, notifications, setRoom, setSession, setReveal, setResults, setPhase, addNotification } = useRoomStore();
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }

    const socket = connectSocket();

    const onConnect = () => {
      setConnected(true);
      setConnectionError('');
      socket.emit('room:join', { roomCode: code, token: accessToken! });
    };
    const onConnectError = (err: any) => {
      setConnectionError('Unable to connect to server. Make sure the backend is running.');
    };
    const onDisconnect = () => setConnected(false);
    
    const onRoomState = (roomData: Room) => setRoom(roomData);
    const onRoomEnded = () => {
      addNotification('warning', 'The room was ended by the host.');
      setTimeout(() => router.push('/dashboard'), 2000);
    };
    const onParticipantLeft = (uid: string) => addNotification('info', 'A participant disconnected');
    const onParticipantReconnected = (uid: string) => addNotification('success', 'A participant reconnected');
    
    const onSessionStarting = () => {
      addNotification('success', '🚀 Session starting! Get ready...');
      setTimeout(() => setPhase('interview'), 1500);
    };
    
    const onSessionStart = (session: InterviewSession) => {
      setSession(session);
      setPhase('interview');
    };
    
    const onReconnectSync = (session: InterviewSession) => {
      setSession(session);
      setPhase('interview');
      addNotification('success', 'Restored active interview session state');
    };
    
    const onVotingStart = (session: InterviewSession) => {
      console.log('[DEBUG-CLIENT] Received interview:voting_start', session);
      setSession(session);
    };
    const onScoresRevealed = (reveal: EvaluationReveal) => setReveal(reveal);
    const onTurnComplete = ({ averageScore }: any) => {
      addNotification('success', `Turn complete! Average score: ${averageScore.toFixed(1)}/10`);
    };
    const onRotation = (session: InterviewSession) => {
      setSession(session);
      addNotification('info', `🔄 Next up: ${session.intervieweeName}`);
    };
    
    const onAwardsVotingStart = () => {
      addNotification('success', '🏆 All interviews done! Time to vote for awards.');
      setPhase('awards');
    };
    const onResultsReady = (results: RoomResults) => {
      setResults(results);
      setPhase('results');
    };
    
    const onError = (msg: string) => addNotification('warning', `Error: ${msg}`);
    const onNotification = ({ type, message }: any) => addNotification(type, message);

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onRoomState);
    socket.on('room:ended', onRoomEnded);
    socket.on('room:participant_left', onParticipantLeft);
    socket.on('room:participant_reconnected', onParticipantReconnected);
    socket.on('room:session_starting', onSessionStarting);
    socket.on('interview:session_start', onSessionStart);
    socket.on('interview:reconnect_sync', onReconnectSync);
    socket.on('interview:voting_start', onVotingStart);
    socket.on('interview:scores_revealed', onScoresRevealed);
    socket.on('interview:turn_complete', onTurnComplete);
    socket.on('interview:rotation', onRotation);
    socket.on('awards:voting_start', onAwardsVotingStart);
    socket.on('results:ready', onResultsReady);
    socket.on('error', onError);
    socket.on('notification', onNotification);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onRoomState);
      socket.off('room:ended', onRoomEnded);
      socket.off('room:participant_left', onParticipantLeft);
      socket.off('room:participant_reconnected', onParticipantReconnected);
      socket.off('room:session_starting', onSessionStarting);
      socket.off('interview:session_start', onSessionStart);
      socket.off('interview:reconnect_sync', onReconnectSync);
      socket.off('interview:voting_start', onVotingStart);
      socket.off('interview:scores_revealed', onScoresRevealed);
      socket.off('interview:turn_complete', onTurnComplete);
      socket.off('interview:rotation', onRotation);
      socket.off('awards:voting_start', onAwardsVotingStart);
      socket.off('results:ready', onResultsReady);
      socket.off('error', onError);
      socket.off('notification', onNotification);
      disconnectSocket();
    };
  }, [code, accessToken]);

  if (connectionError) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="bg-mesh" />
        <div className="glass" style={{ maxWidth: 480, padding: '48px 40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔌</div>
          <h2 style={{ fontWeight: 800, marginBottom: 12 }}>Connection Failed</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 28, fontSize: '0.9rem', lineHeight: 1.7 }}>{connectionError}</p>
          <button className="btn-primary" onClick={() => router.push('/dashboard')}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bg-mesh" />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div className="spin" style={{ width: 48, height: 48, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 20px' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Connecting to room <strong>{code}</strong>...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <div className="bg-mesh" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Phase-based rendering */}
        {phase === 'lobby' && <LobbyPanel roomCode={code} />}
        {phase === 'interview' && <InterviewPanel />}
        {phase === 'awards' && <AwardsPanel />}
        {phase === 'results' && <ResultsPanel />}
      </div>
      {/* Notification Toast Stack */}
      <NotificationToast notifications={notifications} />
    </div>
  );
}
