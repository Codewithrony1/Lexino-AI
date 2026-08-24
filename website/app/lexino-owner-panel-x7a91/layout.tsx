import type { Metadata } from 'next';
import { ClerkAuthProvider } from '../../components/ClerkAuthProvider';

export const metadata: Metadata = {
  title: 'Lexino Owner Panel',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OwnerPanelLayout({ children }: { children: React.ReactNode }) {
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}
