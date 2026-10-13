'use client';

import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Mic, MicOff, Video, VideoOff, Minimize2, Maximize2 } from 'lucide-react';

interface VideoOverlayProps {
  partnerName: string;
}

export default function VideoOverlay({ partnerName }: VideoOverlayProps) {
  const {
    localStream,
    remoteStream,
    connectionStatus,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
  } = useWebRTC();

  const [minimized, setMinimized] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch((err) => {
        console.warn('[VideoOverlay] Local play notice:', err);
      });
    }
  }, [localStream]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch((err) => {
        console.warn('[VideoOverlay] Remote play notice:', err);
      });
    }
  }, [remoteStream]);

  if (minimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 100,
          background: 'rgba(15, 15, 25, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 30,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#10b981' : '#f59e0b',
              boxShadow: connectionStatus === 'connected' ? '0 0 8px #10b981' : 'none',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600 }}>
            {connectionStatus === 'connected' ? partnerName : 'Waiting...'}
          </span>
        </div>
        <button
          onClick={() => setMinimized(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title="Expand Video"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 100,
      }}
    >
      {/* Remote Video (Partner) */}
      <div
        style={{
          position: 'relative',
          width: 270,
          height: 200,
          background: '#0d0d14',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
        }}
      >
        {remoteStream ? (
          <video
            ref={(el) => {
              remoteVideoRef.current = el;
              if (el && remoteStream && el.srcObject !== remoteStream) {
                el.srcObject = remoteStream;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-subtle)',
              fontSize: '0.85rem',
              fontWeight: 500,
              gap: 8,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: '#818cf8',
                fontWeight: 700,
              }}
            >
              {partnerName ? partnerName.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              Waiting for <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{partnerName}</span>...
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {connectionStatus === 'connecting' ? 'Connecting live call...' : 'They will appear here once connected'}
            </span>
          </div>
        )}

        {/* Partner Name & Live Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '3px 8px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: 6,
            fontSize: '0.72rem',
            color: 'white',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#10b981' : '#f59e0b',
              boxShadow: connectionStatus === 'connected' ? '0 0 6px #10b981' : 'none',
            }}
          />
          {partnerName}
        </div>

        {/* Minimize Button */}
        <button
          onClick={() => setMinimized(true)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: 5,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 6,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          title="Minimize Video"
        >
          <Minimize2 className="w-3 h-3" />
        </button>
      </div>

      {/* Local Video (Self) */}
      <div
        style={{
          position: 'relative',
          width: 170,
          height: 125,
          background: '#0d0d14',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          alignSelf: 'flex-end',
        }}
      >
        {localStream && isVideoEnabled ? (
          <video
            ref={(el) => {
              localVideoRef.current = el;
              if (el && localStream && el.srcObject !== localStream) {
                el.srcObject = localStream;
                el.play().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-subtle)',
              fontSize: '0.72rem',
              textAlign: 'center',
              padding: 8,
            }}
          >
            {isVideoEnabled ? 'Camera starting...' : 'Camera Off'}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            padding: '2px 6px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: 4,
            fontSize: '0.68rem',
            color: 'white',
            fontWeight: 500,
          }}
        >
          You
        </div>

        {/* Media Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <button
            onClick={toggleAudio}
            style={{
              padding: 5,
              borderRadius: '50%',
              background: isAudioEnabled ? 'rgba(0,0,0,0.75)' : '#ef4444',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          </button>
          <button
            onClick={toggleVideo}
            style={{
              padding: 5,
              borderRadius: '50%',
              background: isVideoEnabled ? 'rgba(0,0,0,0.75)' : '#ef4444',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

