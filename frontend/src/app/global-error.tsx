'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0f0f0f',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          gap: '16px',
        }}
      >
        <h2 style={{ margin: 0 }}>Something went wrong</h2>
        <button
          onClick={reset}
          style={{
            padding: '8px 20px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
