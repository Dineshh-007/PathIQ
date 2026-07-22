'use client';
import { useEffect, useState } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success';
  message: string;
}

const typeConfig = {
  info:    { icon: 'ℹ️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  warning: { icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  success: { icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
};

export default function NotificationToast({ notifications }: { notifications: Notification[] }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 1000, maxWidth: 360 }}>
      {notifications.map((n, i) => {
        const cfg = typeConfig[n.type];
        return (
          <div key={n.id} className="slide-in-right" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'flex-start', gap: 10, animationDelay: `${i * 0.05}s` }}>
            <span style={{ flexShrink: 0, fontSize: 16 }}>{cfg.icon}</span>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-text)', lineHeight: 1.5 }}>{n.message}</span>
          </div>
        );
      })}
    </div>
  );
}
