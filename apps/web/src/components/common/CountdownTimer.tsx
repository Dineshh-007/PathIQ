'use client';
import { useEffect, useState } from 'react';

interface TimerProps {
  endsAt: string | null; // ISO timestamp
  durationSecs: number;
  onExpire?: () => void;
  size?: number;
  label?: string;
}

export default function CountdownTimer({ endsAt, durationSecs, onExpire, size = 96, label }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSecs);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      const s = Math.max(0, Math.ceil(ms / 1000));
      setSecondsLeft(s);
      if (s === 0) onExpire?.();
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  const pct = Math.max(0, secondsLeft / durationSecs);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  const color = pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div className="timer-ring" style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-surface-3)" strokeWidth={6} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      {label && <span style={{ fontSize: '0.73rem', color: 'var(--color-text-subtle)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>}
    </div>
  );
}
