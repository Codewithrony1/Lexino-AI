import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lexino Owner Panel',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OwnerPanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
