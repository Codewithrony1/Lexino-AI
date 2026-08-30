import { ClerkProvider } from '@clerk/nextjs';

/**
 * Clerk configuration for the routes that actually need an authenticated client.
 *
 * This used to live in the root layout, which meant every visitor to the static
 * marketing pages downloaded Clerk's React client plus the cross-origin
 * clerk.browser.js loader for nothing. It is now mounted only by the (app),
 * (auth) and (admin) route group layouts. The (frontend) marketing pages read
 * the signed-in hint from the __client_uat cookie in
 * /lexino-website/script.js instead, so they need no Clerk JS at all.
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
      signInForceRedirectUrl="/chat"
      signUpForceRedirectUrl="/chat"
      signInFallbackRedirectUrl="/chat"
      signUpFallbackRedirectUrl="/chat"
    >
      {children}
    </ClerkProvider>
  );
}
