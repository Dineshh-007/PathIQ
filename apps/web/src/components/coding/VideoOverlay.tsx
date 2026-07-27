'use client';

import { useEffect, useRef } from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoOverlayProps {
  partnerName: string;
}

export default function VideoOverlay({ partnerName }: VideoOverlayProps) {
  const { localStream, remoteStream, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } = useWebRTC();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 50 }}>
      {/* Remote Video (Partner) */}
      <div style={{ position: 'relative', width: 260, height: 195, background: '#111', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}>
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-subtle)', fontSize: '0.85rem', fontWeight: 500 }}>
            Waiting for {partnerName}...
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '4px 10px', background: 'rgba(0,0,0,0.7)', borderRadius: 6, fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>
          {partnerName}
        </div>
      </div>

      {/* Local Video (Self) */}
      <div style={{ position: 'relative', width: 180, height: 135, background: '#111', borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', alignSelf: 'flex-end' }}>
        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-subtle)', fontSize: '0.75rem' }}>
            Camera starting...
          </div>
        )}
        
        {/* Controls */}
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleAudio}
            style={{
              padding: 6,
              borderRadius: '50%',
              background: isAudioEnabled ? 'rgba(0,0,0,0.7)' : '#ef4444',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isAudioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleVideo}
            style={{
              padding: 6,
              borderRadius: '50%',
              background: isVideoEnabled ? 'rgba(0,0,0,0.7)' : '#ef4444',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
