import OwnerPanel from '../lexino-owner-panel-x7a91/page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Console — Lexino AI',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ConsolePage() {
  return <OwnerPanel />;
}
