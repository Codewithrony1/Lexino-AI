import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

/**
 * Inter is requested from the document head as a single variable-font stylesheet
 * covering every weight the app uses (300-800).
 *
 * Previously each stylesheet pulled Inter in with `@import url(...)`, which the
 * browser can only discover *after* that stylesheet has downloaded and parsed —
 * a serialized round trip on the critical path. Declaring it here makes the font
 * discoverable in the initial HTML and preconnects the two Google Fonts origins
 * so the TLS handshakes overlap with the rest of the page load.
 */
const INTER_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap';

const siteUrl = 'https://lexinoai.in';

export const viewport: Viewport = {
  themeColor: '#050506',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Lexino AI — Best AI Chatbot for Study, Exam Preparation & Coding',
    template: '%s | Lexino AI',
  },
  description:
    'Lexino AI is the #1 smartest AI chatbot and preparation assistant. Master UPSC, JEE, NEET, GATE, coding interviews, and daily tasks with ultra-fast AI reasoning.',
  applicationName: 'Lexino AI',
  authors: [{ name: 'Lexino AI Team', url: siteUrl }],
  generator: 'Next.js',
  keywords: [
    'Lexino AI',
    'Lexino',
    'AI',
    'chatbot AI',
    'best AI for preparation',
    'AI for exams',
    'UPSC AI preparation',
    'JEE NEET AI study',
    'GATE exam AI',
    'coding interview AI',
    'fastest AI chatbot',
    'student AI assistant',
    'artificial intelligence study partner',
    'study AI',
    'exam preparation assistant',
  ],
  creator: 'Lexino AI',
  publisher: 'Lexino AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'Lexino AI — Best AI Chatbot for Study, Exam Preparation & Coding',
    description:
      'Lexino AI is the smartest AI chatbot and thinking partner. Accelerate your exam prep (UPSC, JEE, NEET, GATE), master technical coding interviews, and boost daily productivity.',
    url: siteUrl,
    siteName: 'Lexino AI',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/lexino-logo.png`,
        width: 1200,
        height: 630,
        alt: 'Lexino AI - Smartest Digital Partner & Exam Preparation AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lexino AI — Best AI Chatbot for Study, Exam Preparation & Coding',
    description:
      'Lexino AI is the smartest AI chatbot and thinking partner. Accelerate your exam prep (UPSC, JEE, NEET, GATE) and master coding interviews.',
    images: [`${siteUrl}/lexino-logo.png`],
    creator: '@lexino_ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/lexino-logo.png',
    shortcut: '/lexino-logo.png',
    apple: '/lexino-logo.png',
  },
};

const jsonLdData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Lexino AI',
    url: siteUrl,
    logo: `${siteUrl}/lexino-logo.png`,
    description:
      'Lexino AI is an advanced AI chatbot and learning platform built for exam preparation, technical interviews, and automated productivity.',
    sameAs: ['https://www.instagram.com/lexino.ai/'],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'lexinoofficial@gmail.com',
      contactType: 'Customer Support',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lexino AI',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/help?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Lexino AI',
    operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
    applicationCategory: 'EducationalApplication, ProductivityApplication, AIApplication',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        name: 'Explorer Free Tier',
      },
      {
        '@type': 'Offer',
        price: '149',
        priceCurrency: 'INR',
        name: 'Student Preparation Plan',
      },
      {
        '@type': 'Offer',
        price: '399',
        priceCurrency: 'INR',
        name: 'Pro Access Plan',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1480',
      bestRating: '5',
      worstRating: '1',
    },
  },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={INTER_STYLESHEET} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
