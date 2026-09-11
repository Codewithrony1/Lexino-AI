import { ClerkProvider } from '@clerk/nextjs';
import { headers } from 'next/headers';

/**
 * Clerk configuration for routes that require authentication.
 * Dynamically detects satellite domains (chat.lexinoai.in, www.lexinoai.in)
 * and connects them seamlessly to the central auth portal (accounts.lexinoai.in).
 */
export async function AppClerkProvider({ children }: { children: React.ReactNode }) {
  let host = '';
  try {
    const headerList = await headers();
    host = (headerList.get('x-forwarded-host') || headerList.get('host') || '').split(':')[0].toLowerCase();
  } catch {}

  const isLexino = host === 'lexinoai.in' || host.endsWith('.lexinoai.in');
  const isSatellite = isLexino && host !== 'accounts.lexinoai.in' && !host.startsWith('localhost') && process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE !== 'false';

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl={isSatellite ? 'https://accounts.lexinoai.in/login' : '/login'}
      signUpUrl={isSatellite ? 'https://accounts.lexinoai.in/signup' : '/signup'}
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
