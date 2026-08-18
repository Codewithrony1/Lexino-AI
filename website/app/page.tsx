import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { ClientScriptLoader } from '../components/ClientScriptLoader';

const siteUrl = 'https://lexinoai.in';

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

export function getWebsiteBody() {
  const possiblePaths = [
    path.join(process.cwd(), 'Lexino Website', 'index.html'),
    path.join(process.cwd(), 'website', 'Lexino Website', 'index.html'),
    path.join(process.cwd(), 'public', 'index.html'),
    path.join(process.cwd(), 'website', 'public', 'index.html'),
  ];

  let html = '';
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        html = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
        break;
      }
    } catch {
      // continue search
    }
  }

  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';

  return body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '')
    .replaceAll('src="Lexino_AI_Logo-removebg-preview.png"', 'src="/lexino-logo.png"')
    .replaceAll('src="./Lexino_AI_Logo-removebg-preview.png"', 'src="/lexino-logo.png"')
    .replaceAll('src="mp_.mp4"', 'src="/lexino-website/mp_.mp4"')
    .replaceAll(
      'src="/Lexino Website/Manifest Anything You Desire  10 Minute Meditation Music.mp3"',
      'src="/lexino-website/Manifest Anything You Desire  10 Minute Meditation Music.mp3"',
    );
}

export default async function LandingPage() {
  const { userId } = await auth();

  let websiteMarkup = getWebsiteBody();

  if (userId) {
    websiteMarkup = websiteMarkup
      .replaceAll('Experience Lexino AI Now 🚀', 'Go to Chat Dashboard 🚀')
      .replaceAll('Get Started', 'Go to Chat')
      .replaceAll('Get Student Plan', 'Go to Chat')
      .replaceAll('Get Pro Access', 'Go to Chat')
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
