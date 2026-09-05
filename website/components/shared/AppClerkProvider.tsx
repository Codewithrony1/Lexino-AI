import { ClerkProvider } from '@clerk/nextjs';

/**
 * Clerk configuration for the routes that actually need an authenticated client.
 *
 * Configured with allowedRedirectOrigins to support cross-subdomain authentication
 * across accounts.lexinoai.in, chat.lexinoai.in, and www.lexinoai.in.
 */
export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
        'pk_test_Y2xlYW4td2hpcHBldC04OS5jbGVyay5hY2NvdW50cy5kZXYk'
      }
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/chat"
      signUpFallbackRedirectUrl="/chat"
      allowedRedirectOrigins={[
        'https://chat.lexinoai.in',
        'https://accounts.lexinoai.in',
        'https://www.lexinoai.in',
        'https://docs.lexinoai.in',
      ]}
    >
      {children}
    </ClerkProvider>
  );
}
