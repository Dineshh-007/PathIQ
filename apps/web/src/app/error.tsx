'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div className="bg-mesh" />
      <div className="glass scale-in" style={{ width: '100%', maxWidth: 480, padding: '48px 40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>Something went wrong!</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
          An unexpected error occurred while rendering this page.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => reset()}>Try again</button>
          <Link href="/">
            <button className="btn-ghost">Go Home</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
