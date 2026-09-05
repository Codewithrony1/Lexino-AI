'use client';

import { AuthenticateWithRedirectCallback, useSession } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function SSOCallbackPage() {
  const { session } = useSession();

  useEffect(() => {
    if (session && typeof window !== 'undefined' && window.location.hostname.endsWith('lexinoai.in')) {
      session.getToken().then((token) => {
        if (token) {
          document.cookie = `__session=${token}; Domain=.lexinoai.in; Path=/; SameSite=Lax; Secure`;
        }
      }).catch(() => {});
    }
  }, [session]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020208] text-white">
      <div className="text-center p-8 rounded-2xl border border-violet-500/30 bg-slate-950/80 backdrop-blur-xl max-w-sm w-full mx-4 shadow-2xl shadow-violet-500/10">
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-semibold tracking-wide text-slate-100">Connecting to Lexino AI</h2>
        <p className="text-xs text-slate-400 mt-1">Completing secure authentication...</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
