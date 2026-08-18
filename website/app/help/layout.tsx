import type { Metadata } from 'next';

const siteUrl = 'https://lexinoai.in';

export const metadata: Metadata = {
  title: 'Help Center, FAQs & 24/7 Support — Lexino AI',
  description:
    'Find instant answers, exam preparation guides, billing information, troubleshooting steps, and 24/7 customer support for Lexino AI.',
  alternates: {
    canonical: `${siteUrl}/help`,
  },
  openGraph: {
    title: 'Help Center & Support — Lexino AI',
    description:
      'Find instant answers, study workflows, and technical support for Lexino AI.',
    url: `${siteUrl}/help`,
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
