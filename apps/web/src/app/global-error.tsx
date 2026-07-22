'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
          <div className="bg-mesh" style={{
            position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: 'var(--color-bg)'
          }} />
          <div className="glass scale-in" style={{ width: '100%', maxWidth: 480, padding: '48px 40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>💥</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>A critical error occurred!</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
              Something went fundamentally wrong. We are sorry for the inconvenience.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => reset()}>Try again</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
