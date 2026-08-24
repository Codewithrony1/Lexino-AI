import type { Metadata } from 'next';
import { ClerkAuthProvider } from '../../components/ClerkAuthProvider';

const siteUrl = 'https://lexinoai.in';

export const metadata: Metadata = {
  title: 'Create Your Free Account — Best AI for Learning & Exam Prep',
  description:
    'Sign up for Lexino AI today for free. Experience ultra-fast AI streaming, intelligent exam prep (UPSC/JEE/NEET/GATE), coding assistance, and 3D space wallpapers.',
  alternates: {
    canonical: `${siteUrl}/signup`,
  },
  openGraph: {
    title: 'Create Your Free Account — Lexino AI',
    description:
      'Sign up for Lexino AI for free and start accelerating your learning, exam preparation, and productivity.',
    url: `${siteUrl}/signup`,
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}
