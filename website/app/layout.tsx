import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lexino AI - Your Smartest Digital Partner | Advanced AI Assistant',
  description: 'Lexino AI is an advanced Artificial Intelligence assistant designed to simplify tasks, generate ideas, automate work, and boost productivity.',
  authors: [{ name: 'Lexino AI' }],
  creator: 'Lexino AI',
  publisher: 'Lexino AI',
  openGraph: {
    title: 'Lexino AI - Your Smartest Digital Partner',
    description: 'Lexino AI is an advanced Artificial Intelligence assistant designed to simplify tasks, generate ideas, automate work, and boost productivity.',
    url: 'https://lexino.ai',
    siteName: 'Lexino AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lexino AI - Advanced AI Assistant',
    description: 'Lexino AI is an advanced Artificial Intelligence assistant designed to simplify tasks, generate ideas, automate work, and boost productivity.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/signup"
      signInForceRedirectUrl="/chat"
      signUpForceRedirectUrl="/chat"
      signInFallbackRedirectUrl="/chat"
      signUpFallbackRedirectUrl="/chat"
    >
      <html lang="en" suppressHydrationWarning>
        <body>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
