import type { Metadata } from 'next';
import { STATIC_LANDING_HTML } from '@/lib/staticLandingHtml';

export const dynamic = 'force-static';
export const revalidate = false;

const siteUrl = 'https://lexinoai.in';

export const metadata: Metadata = {
  title: 'Pricing Plans — Free, Student & Pro Access for Exam & Career Prep',
  description:
    'Affordable AI plans for students, creators, and engineers. Access advanced GPT-4o & Claude Sonnet intelligence for exam preparation starting at just ₹49/month.',
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
  openGraph: {
    title: 'Lexino AI Pricing — Free, Student & Pro Plans',
    description:
      'Affordable AI plans for students, creators, and engineers. Access advanced GPT-4o & Claude Sonnet intelligence starting at ₹49/month.',
    url: `${siteUrl}/pricing`,
  },
};

const pricingFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does the Lexino AI Student Plan work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Student Plan is priced at ₹49/month and provides 300 queries/day, GPT-4o access, coding support, priority speed, and space wallpapers for students preparing for exams like UPSC, JEE, NEET, and GATE.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is included in the Lexino AI Pro Plan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Pro Plan is ₹299/month and includes 1500 queries/day, access to both GPT-4o and Claude Sonnet models, unlimited 3D wallpapers, priority response speed, code debugging, and priority support.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use Lexino AI for free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, the Explorer Free Tier gives 50 queries every day with standard response speeds and core AI capabilities at ₹0 cost.',
      },
    },
  ],
};

const criticalHeroCss = `
:root {
  --color-bg-dark: #050506;
  --color-bg-light: #f8fafc;
  --color-surface-dark: rgba(14, 14, 18, 0.72);
  --color-text-dark: #f2f2f5;
  --color-text-secondary-dark: #a9a9b4;
  --color-primary: #a855f7;
  --color-secondary: #ec4899;
  --color-accent: #6366f1;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body, .page-content, .home-page {
  font-family: var(--font-poppins), 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #050506;
  color: #f2f2f5;
  line-height: 1.6;
  overflow-x: hidden;
}
.bg-animation {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0; overflow: hidden; pointer-events: none; background: #050506;
  contain: layout paint;
}
nav {
  position: fixed; top: 0; width: 100%; padding: 1.25rem 6%;
  display: flex; justify-content: space-between; align-items: center;
  z-index: 100; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  background: rgba(5, 5, 6, 0.75);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.brand-logo { height: 45px; width: auto; object-fit: contain; }
.logo { font-family: var(--font-orbitron), 'Orbitron', sans-serif; font-size: 1.4rem; font-weight: 800; letter-spacing: 2px; color: #fff; }
.logo-sup { font-size: 0.65rem; color: #a855f7; margin-left: 2px; }
.nav-right { display: flex; align-items: center; gap: 1.5rem; }
.nav-links { display: flex; gap: 1.75rem; list-style: none; }
.nav-links a { color: #a9a9b4; text-decoration: none; font-size: 0.95rem; font-weight: 500; }
`;

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema) }}
      />
      {/* Critical inlined CSS for 0ms First Paint */}
      <style dangerouslySetInnerHTML={{ __html: criticalHeroCss }} />

      {/* Preload critical stylesheet */}
      <link rel="preload" href="/lexino-website/styles.css" as="style" />
      <link rel="stylesheet" href="/lexino-website/styles.css" />

      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: STATIC_LANDING_HTML }} />
      <script defer src="/lexino-website/script.js" />

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', () => {
              const pricing = document.getElementById('pricing');
              if (pricing) pricing.scrollIntoView({ behavior: 'smooth' });
            });
          `,
        }}
      />
    </>
  );
}
