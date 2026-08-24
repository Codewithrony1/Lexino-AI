import type { Metadata } from 'next';
import { ClerkAuthProvider } from '../../components/ClerkAuthProvider';

const siteUrl = 'https://lexinoai.in';

export const metadata: Metadata = {
  title: 'Sign In — Access Your AI Chatbot & Study Workspace',
  description:
    'Sign in to Lexino AI to resume your AI study sessions, exam preparation notes, coding interview practice, and personalized chat workspaces.',
  alternates: {
    canonical: `${siteUrl}/login`,
  },
  openGraph: {
    title: 'Sign In — Lexino AI',
    description:
      'Sign in to Lexino AI to access your intelligent thinking partner and study workspace.',
    url: `${siteUrl}/login`,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}
