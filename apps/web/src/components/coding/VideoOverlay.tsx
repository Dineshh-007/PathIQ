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
    <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
      {/* Remote Video (Partner) */}
      <div className="relative w-64 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 backdrop-blur-sm group">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 font-medium">
            Waiting for {partnerName}...
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium">
          {partnerName}
        </div>
      </div>

      {/* Local Video (Self) */}
      <div className="relative w-48 h-36 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 backdrop-blur-sm group ml-auto">
        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Mute local video to prevent echo
            className="w-full h-full object-cover transform -scale-x-100" // Mirror local video
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
            Camera starting...
          </div>
        )}
        
        {/* Controls */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded-full ${isAudioEnabled ? 'bg-gray-800/80 text-white hover:bg-gray-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
          >
            {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-1.5 rounded-full ${isVideoEnabled ? 'bg-gray-800/80 text-white hover:bg-gray-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
          >
            {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
