'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';

type AuthShellProps = {
  children: ReactNode;
  mode: 'signin' | 'signup';
};

export function AuthShell({ children, mode }: AuthShellProps) {
  const [logoHref, setLogoHref] = useState('/');

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      setLogoHref('/chat');
    }
  }, []);

  return (
    <main className="auth-page">
      <div className="auth-wallpaper" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className="auth-brand-panel" aria-label="Lexino AI">
        <Link href={logoHref} className="auth-logo" aria-label="Lexino AI home">
          <span className="auth-logo-mark">L</span>
          <span>Lexino AI</span>
        </Link>
        <div className="auth-brand-copy">
          <p className="auth-kicker">Private AI Workspace</p>
          <h1>Your Smartest Digital Partner</h1>
          <p>
            Secure access to your cinematic AI chat, saved conversations, pinned threads,
            and future cloud sync.
          </p>
        </div>
        <div className="auth-orbit" aria-hidden="true">
          <div className="auth-orbit-core" />
          <div className="auth-orbit-ring ring-one" />
          <div className="auth-orbit-ring ring-two" />
        </div>
      </section>

      <section className="auth-card-panel" aria-label={mode === 'signin' ? 'Sign in' : 'Sign up'}>
        {children}
      </section>
    </main>
  );
}
