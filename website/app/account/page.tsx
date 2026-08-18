import type { Metadata } from 'next';
import { UserProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { lexinoClerkAppearance } from '../../lib/clerkAppearance';

export const metadata: Metadata = {
  title: 'Account Settings & Profile',
  description: 'Manage your Lexino AI subscription tier, security preferences, and profile details.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountPage() {
  let authResult: any = null;
  try {
    authResult = await auth();
  } catch {
    authResult = null;
  }
  
  if (!authResult?.userId) {
    redirect('/login?redirect_url=/account');
  }

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

        <section style={{
          background: 'rgba(9, 16, 24, 0.65)',
          border: '1px solid rgba(52, 211, 153, 0.15)',
          borderRadius: '16px',
          padding: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <UserProfile appearance={lexinoClerkAppearance} routing="hash" />
        </section>
      </div>
    </main>
  );
}
