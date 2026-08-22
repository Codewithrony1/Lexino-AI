import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { ClientScriptLoader } from '../components/ClientScriptLoader';
import { STATIC_LANDING_HTML } from '../lib/staticLandingHtml';

const siteUrl = 'https://lexinoai.in';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lexino AI — Best AI Chatbot for Study, Exam Preparation & Coding',
  description:
    'Lexino AI is the #1 AI chatbot and digital mind for students, developers, and professionals. Accelerate exam preparation (UPSC, JEE, NEET, GATE), code mastery, and creative productivity with ultra-fast AI.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'Lexino AI — Best AI Chatbot for Study, Exam Preparation & Coding',
    description:
      'Lexino AI is the smartest AI chatbot and thinking partner. Accelerate your exam prep (UPSC, JEE, NEET, GATE), master technical coding interviews, and boost daily productivity.',
    url: siteUrl,
  },
};

const homeFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Lexino AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Lexino AI is an ultra-fast artificial intelligence chatbot and digital thinking partner designed for study, competitive exam preparation (UPSC, JEE, NEET, GATE), coding interview mastery, and automated productivity.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why is Lexino AI the best AI for exam and interview preparation?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Lexino AI offers instant concept explanations, mock test generation, step-by-step math and science problem solving, DSA coding interview simulation, and personalized revision workflows.',
      },
    },
    {
      '@type': 'Question',
      name: 'How fast is Lexino AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Lexino AI uses high-speed Server-Sent Events (SSE) token streaming and optimized edge infrastructure to deliver sub-second response times with zero lag and native-app smoothness.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Lexino AI free for students?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Lexino AI offers an Explorer Free Tier with 50 daily queries, as well as a dedicated Student Plan for ₹149/month with GPT-4o access and extended limits.',
      },
    },
  ],
};

export default async function LandingPage() {
  let userId: string | null = null;
  try {
    const authData = await auth();
    userId = authData?.userId ?? null;
  } catch {
    userId = null;
  }

  let websiteMarkup = STATIC_LANDING_HTML;

  if (userId) {
    websiteMarkup = websiteMarkup
      .replaceAll('Experience Lexino AI Now 🚀', 'Go to Chat Dashboard 🚀')
      .replaceAll('navigateToTry()', "window.location.href='/chat'");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }}
      />
      <link rel="stylesheet" href="/lexino-website/styles.css" />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: websiteMarkup }} />
      <ClientScriptLoader scripts={['/lexino-website/script.js']} />
    </>
  );
}
