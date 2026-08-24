import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

/**
 * Mounts Clerk for the routes that actually need it (Clerk UI components or
 * Clerk client hooks).
 *
 * This deliberately lives outside the root layout: keeping ClerkProvider off the
 * public marketing routes (/, /pricing, /terms, /privacy, /help, /not-found)
 * stops the Clerk client bundle and its bootstrap request from being shipped to
 * visitors who are not signing in. Server-side `auth()` / `currentUser()` do not
 * require this provider, so authenticated rendering on public pages still works.
 */
export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
        'pk_test_Y2xlYW4td2hpcHBldC04OS5jbGVyay5hY2NvdW50cy5kZXYk'
      }
      signInUrl="/login"
      signUpUrl="/signup"
      signInForceRedirectUrl="/chat"
      signUpForceRedirectUrl="/chat"
      signInFallbackRedirectUrl="/chat"
      signUpFallbackRedirectUrl="/chat"
    >
      {children}
    </ClerkProvider>
  );
}
