import { ClerkProvider } from '@clerk/nextjs';

/**
 * Clerk configuration for routes that require authentication.
 * Configured with direct paths to Lexino AI's custom 3D cyberpunk auth UI
 * (/login and /signup), with cross-subdomain sessions shared via clerk.lexinoai.in (.lexinoai.in).
 */
export async function AppClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/chat"
      signUpFallbackRedirectUrl="/chat"
      allowedRedirectOrigins={[
        'https://chat.lexinoai.in',
        'https://www.lexinoai.in',
        'https://docs.lexinoai.in',
      ]}
    >
      {children}
    </ClerkProvider>
  );
}
