'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@peerprep/shared-types';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (targetUserId?: string) => Promise<void>;
  endCall: () => void;
  isCalling: boolean;
  connectionStatus: ConnectionStatus;
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
  partnerUserId?: string | null;
  isCaller?: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function WebRTCProvider({ children, socket, userId, partnerUserId, isCaller }: WebRTCProviderProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const activeTargetId = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteMediaStream = useRef<MediaStream>(new MediaStream());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const mediaPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const isCallInitiatedRef = useRef(false);

  const endCall = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }
    remoteMediaStream.current = new MediaStream();
    setRemoteStream(null);
    setIsCalling(false);
    setConnectionStatus('idle');
    activeTargetId.current = null;
    pendingCandidatesRef.current = [];
    isCallInitiatedRef.current = false;
  }, []);

  const attachTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    const senders = pc.getSenders();
    stream.getTracks().forEach((track) => {
      const exists = senders.some((s) => s.track && s.track.id === track.id);
      if (!exists) {
        try {
          pc.addTrack(track, stream);
        } catch (e) {
          console.warn('[WebRTC] addTrack notice:', e);
        }
      }
    });
  }, []);

  const createPeerConnection = useCallback((targetUserId: string) => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;
    activeTargetId.current = targetUserId;
    setConnectionStatus('connecting');

    if (localStreamRef.current) {
      attachTracks(pc, localStreamRef.current);
    }

    pc.ontrack = (event) => {
      console.log('[WebRTC] ontrack received:', event.track.kind);
      if (!remoteMediaStream.current.getTracks().some((t) => t.id === event.track.id)) {
        remoteMediaStream.current.addTrack(event.track);
      }
      setRemoteStream(new MediaStream(remoteMediaStream.current.getTracks()));
      setConnectionStatus('connected');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice_candidate', {
          targetUserId,
          candidate: event.candidate,
          sourceUserId: userId,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
      } else if (pc.iceConnectionState === 'failed') {
        setConnectionStatus('disconnected');
      } else if (pc.iceConnectionState === 'disconnected') {
        setConnectionStatus('disconnected');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setConnectionStatus('disconnected');
      }
    };

    return pc;
  }, [socket, userId, attachTracks]);

  const getMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;
    if (mediaPromiseRef.current) return mediaPromiseRef.current;

    const promise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        if (peerConnection.current) {
          attachTracks(peerConnection.current, stream);
        }
        return stream;
      } catch (err: any) {
        console.warn('[WebRTC] Video+Audio capture failed, falling back to audio only:', err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setIsVideoEnabled(false);

          if (peerConnection.current) {
            attachTracks(peerConnection.current, audioStream);
          }
          return audioStream;
        } catch (audioErr) {
          console.error('[WebRTC] Failed to capture any audio/video devices:', audioErr);
          return null;
        }
      } finally {
        mediaPromiseRef.current = null;
      }
    })();

    mediaPromiseRef.current = promise;
    return promise;
  }, [attachTracks]);

  // Request media devices on mount
  useEffect(() => {
    getMedia();

    return () => {
      endCall();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [getMedia, endCall]);

  const startCall = useCallback(async (targetUserId?: string) => {
    const target = targetUserId || partnerUserId || activeTargetId.current;
    if (!socket || !target) return;
    console.log('[WebRTC] startCall to:', target);

    activeTargetId.current = target;
    isCallInitiatedRef.current = true;

    let stream = localStreamRef.current;
    if (!stream) {
      stream = await getMedia();
    }

    const pc = createPeerConnection(target);
    if (stream) {
      attachTracks(pc, stream);
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', {
        targetUserId: target,
        offer,
        sourceUserId: userId,
      });
      setIsCalling(true);
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
    }
  }, [socket, partnerUserId, userId, getMedia, createPeerConnection, attachTracks]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc:offer', async ({ sourceUserId, offer }: any) => {
      if (!sourceUserId || sourceUserId === userId) return;
      console.log('[WebRTC] Received offer from:', sourceUserId);
      activeTargetId.current = sourceUserId;

      let stream = localStreamRef.current;
      if (!stream) {
        stream = await getMedia();
      }

      let pc = peerConnection.current;
      if (!pc || pc.signalingState !== 'stable') {
        if (pc) {
          try {
            pc.close();
          } catch {}
        }
        pc = createPeerConnection(sourceUserId);
      }

      if (stream) {
        attachTracks(pc, stream);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush pending candidates
        while (pendingCandidatesRef.current.length > 0) {
          const c = pendingCandidatesRef.current.shift();
          if (c) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (candErr) {
              console.warn('[WebRTC] Queued ICE candidate failed:', candErr);
            }
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          targetUserId: sourceUserId,
          answer,
          sourceUserId: userId,
        });
        setIsCalling(true);
      } catch (err) {
        console.error('[WebRTC] Failed to handle offer and create answer:', err);
      }
    });

    socket.on('webrtc:answer', async ({ sourceUserId, answer }: any) => {
      if (!sourceUserId || sourceUserId === userId) return;
      console.log('[WebRTC] Received answer from:', sourceUserId);
      const pc = peerConnection.current;
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Flush pending candidates
          while (pendingCandidatesRef.current.length > 0) {
            const c = pendingCandidatesRef.current.shift();
            if (c) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (candErr) {
                console.warn('[WebRTC] Queued ICE candidate failed:', candErr);
              }
            }
          }
          setIsCalling(true);
        } catch (err) {
          console.error('[WebRTC] Failed to set remote description from answer:', err);
        }
      }
    });

    socket.on('webrtc:ice_candidate', async ({ sourceUserId, candidate }: any) => {
      if (!candidate || sourceUserId === userId) return;
      const pc = peerConnection.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Failed to add ICE candidate:', err);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on('webrtc:ready', async ({ sourceUserId }: any) => {
      if (!sourceUserId || sourceUserId === userId) return;
      console.log('[WebRTC] Received peer ready signal from:', sourceUserId);
      if (isCaller || (!isCallInitiatedRef.current && userId > sourceUserId)) {
        startCall(sourceUserId);
      }
    });

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice_candidate');
      socket.off('webrtc:ready');
    };
  }, [socket, userId, isCaller, getMedia, createPeerConnection, attachTracks, startCall]);

  // Auto-call negotiation when partner is known
  useEffect(() => {
    if (!socket || !partnerUserId || partnerUserId === userId) return;

    // Send ready notification to partner
    socket.emit('webrtc:ready', { targetUserId: partnerUserId, sourceUserId: userId });

    // The designated caller initiates the call after a short delay to allow room join & media init
    if (isCaller) {
      const timer = setTimeout(() => {
        if (!peerConnection.current || peerConnection.current.connectionState !== 'connected') {
          startCall(partnerUserId);
        }
      }, 600);
      return () => clearTimeout(timer);
    } else {
      // Fallback for interviewee: if no call received after 4s, attempt call
      const fallbackTimer = setTimeout(() => {
        if (!peerConnection.current && !remoteStream) {
          console.log('[WebRTC] Fallback trigger: Candidate calling Interviewer');
          startCall(partnerUserId);
        }
      }, 4000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [socket, partnerUserId, userId, isCaller, remoteStream, startCall]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <WebRTCContext.Provider
      value={{
        localStream,
        remoteStream,
        startCall,
        endCall,
        isCalling,
        connectionStatus,
        isVideoEnabled,
        isAudioEnabled,
        toggleVideo,
        toggleAudio,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
}

