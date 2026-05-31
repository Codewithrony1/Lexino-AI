import { UserProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { lexinoClerkAppearance } from '../../lib/clerkAppearance';

export default async function AccountPage() {
  await auth.protect();

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #030506 0%, #071017 44%, #020405 100%)',
      color: '#f8fafc',
      padding: '44px 24px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(52, 211, 153, 0.22)',
          paddingBottom: '20px',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Account Profile</h1>
            <p style={{ margin: '4px 0 0', color: '#a6b6c8', fontSize: '14px' }}>Manage settings, security keys, and subscription tier</p>
          </div>
          <Link href="/chat" style={{
            background: 'rgba(52, 211, 153, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.22)',
            color: '#34d399',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 700
          }}>
            ← Return to Chat
          </Link>
        </header>
        <UserProfile routing="hash" appearance={lexinoClerkAppearance} />
      </div>
    </main>
  );
}
