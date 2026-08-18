import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found — Lexino AI',
  description: 'The requested page could not be found. Return to Lexino AI.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #030506 0%, #071017 44%, #020405 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: '72px',
          fontWeight: 900,
          margin: 0,
          background: 'linear-gradient(135deg, #00f0ff 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        404
      </h1>
      <h2 style={{ fontSize: '22px', fontWeight: 600, margin: '16px 0 8px', color: '#e2e8f0' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#a6b6c8', maxWidth: '440px', lineHeight: 1.6, marginBottom: '28px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          background: 'linear-gradient(135deg, #10a37f 0%, #34d399 100%)',
          color: '#030506',
          padding: '12px 28px',
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: '14px',
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(52, 211, 153, 0.25)',
        }}
      >
        Return to Home
      </Link>
    </main>
  );
}
