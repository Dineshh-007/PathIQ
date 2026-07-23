'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@interview/shared-types';

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (targetUserId: string) => void;
  endCall: () => void;
  isCalling: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) throw new Error('useWebRTC must be used within WebRTCProvider');
  return context;
};

interface WebRTCProviderProps {
  children: React.ReactNode;
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  userId: string;
}

export function WebRTCProvider({ children, socket, userId }: WebRTCProviderProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const activeTargetId = useRef<string | null>(null);

  useEffect(() => {
    // Request media devices on mount
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
      } catch (err) {
        console.error('Failed to access media devices', err);
      }
    };
    initMedia();

    return () => {
      endCall();
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc:offer', async ({ sourceUserId, offer }) => {
      if (!localStream) return;
      activeTargetId.current = sourceUserId;
      
      const pc = createPeerConnection(sourceUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('webrtc:answer', { targetUserId: sourceUserId, answer });
      setIsCalling(true);
    });

    socket.on('webrtc:answer', async ({ sourceUserId, answer }) => {
      if (peerConnection.current && activeTargetId.current === sourceUserId) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setIsCalling(true);
      }
    });

    socket.on('webrtc:ice_candidate', async ({ sourceUserId, candidate }) => {
      if (peerConnection.current && activeTargetId.current === sourceUserId) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice_candidate');
    };
  }, [socket, localStream]);

  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.current = pc;

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice_candidate', { targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  };

  const startCall = async (targetUserId: string) => {
    if (!localStream || !socket) return;
    
    activeTargetId.current = targetUserId;
    const pc = createPeerConnection(targetUserId);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    socket.emit('webrtc:offer', { targetUserId, offer });
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    setIsCalling(false);
    activeTargetId.current = null;
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <WebRTCContext.Provider value={{
      localStream,
      remoteStream,
      startCall,
      endCall,
      isCalling,
      isVideoEnabled,
      isAudioEnabled,
      toggleVideo,
      toggleAudio
    }}>
      {children}
    </WebRTCContext.Provider>
  );
}
