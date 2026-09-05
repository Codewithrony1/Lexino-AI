import { Suspense } from 'react';
import { CustomAuthFlow } from '@/components/auth/CustomAuthFlow';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Lexino AI',
  description: 'Sign in to your private Lexino AI workspace.',
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#020208] text-white">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      }
    >
      <CustomAuthFlow initialMode="signin" />
    </Suspense>
  );
}
