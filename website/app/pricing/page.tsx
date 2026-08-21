import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { getWebsiteBody } from '../page';
import { ClientScriptLoader } from '../../components/ClientScriptLoader';

const siteUrl = 'https://lexinoai.in';

export const metadata: Metadata = {
  title: 'Pricing Plans — Free, Student & Pro Access for Exam & Career Prep',
  description:
    'Affordable AI plans for students, creators, and engineers. Access advanced GPT-4o & Claude Sonnet intelligence for exam preparation starting at just ₹149/month.',
  alternates: {
    canonical: `${siteUrl}/pricing`,
  },
  openGraph: {
    title: 'Lexino AI Pricing — Free, Student & Pro Plans',
    description:
      'Affordable AI plans for students, creators, and engineers. Access advanced GPT-4o & Claude Sonnet intelligence starting at ₹149/month.',
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
        text: 'The Student Plan is priced at ₹149/month and provides 300 queries/day, GPT-4o access, coding support, priority speed, and space wallpapers for students preparing for exams like UPSC, JEE, NEET, and GATE.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is included in the Lexino AI Pro Plan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Pro Plan is ₹399/month and includes 1500 queries/day, access to both GPT-4o and Claude Sonnet models, unlimited 3D wallpapers, priority response speed, code debugging, and priority support.',
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

export default async function PricingPage() {
  let userId: string | null = null;
  try {
    const authData = await auth();
    userId = authData?.userId ?? null;
  } catch {
    userId = null;
  }

  let websiteMarkup = getWebsiteBody();

  if (userId) {
    websiteMarkup = websiteMarkup
      .replaceAll('Experience Lexino AI Now 🚀', 'Go to Chat Dashboard 🚀')
      .replaceAll('navigateToTry()', "window.location.href='/chat'");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaqSchema) }}
      />
      <link rel="stylesheet" href="/lexino-website/styles.css" />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: websiteMarkup }} />
      <ClientScriptLoader scripts={['/lexino-website/script.js']} />
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', () => {
              setTimeout(() => {
                const pricing = document.getElementById('pricing');
                if (pricing) pricing.scrollIntoView({ behavior: 'smooth' });
              }, 150);
            });
          `,
        }}
      />
    </>
  );
}
