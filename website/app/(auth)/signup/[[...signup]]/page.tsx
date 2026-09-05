import { Suspense } from 'react';
import { CustomAuthFlow } from '@/components/auth/CustomAuthFlow';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account | Lexino AI',
  description: 'Join Lexino AI and start your private AI workspace.',
};

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#020208] text-white">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      }
    >
      <CustomAuthFlow initialMode="signup" />
    </Suspense>
  );
}
