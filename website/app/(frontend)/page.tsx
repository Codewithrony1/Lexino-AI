import type { Metadata } from 'next';
import { STATIC_LANDING_HTML } from '@/lib/staticLandingHtml';

export const dynamic = 'force-static';
export const revalidate = false;

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
        text: 'Yes! Lexino AI offers an Explorer Free Tier with 50 daily queries, as well as a dedicated Student Plan for ₹49/month with GPT-4o access and extended limits.',
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
.theme-toggle, .music-toggle { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; width: 40px; height: 40px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.hero { min-height: 90vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 7rem 6% 3rem; position: relative; z-index: 1; }
.hero h1 { font-size: clamp(2rem, 5vw, 3.8rem); font-weight: 800; max-width: 900px; line-height: 1.15; margin-bottom: 1.5rem; letter-spacing: -0.5px; background: linear-gradient(135deg, #ffffff 20%, #c084fc 65%, #f472b6 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero p { font-size: clamp(1rem, 2vw, 1.25rem); max-width: 680px; color: #a9a9b4; margin-bottom: 2rem; }
.cta-button { background: linear-gradient(135deg, #a855f7 0%, #c084fc 45%, #ec4899 100%); color: #fff; padding: 1rem 2.2rem; border-radius: 9999px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 0 30px rgba(168,85,247,0.35); text-decoration: none; font-size: 1.05rem; }
.video-container { margin-top: 3.5rem; width: 100%; max-width: 1050px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); aspect-ratio: 16/9; background: #0c0d14; }
.demo-preview { width: 100%; height: 100%; object-fit: cover; display: block; }
@media (max-width: 768px) {
  .nav-links { display: none; }
  .hero { padding: 6rem 5% 2rem; min-height: auto; }
  .video-container { margin-top: 2rem; }
}
`;

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }}
      />
      {/* Priority 3: Preload critical above-the-fold assets & stylesheet */}
      <link rel="preload" as="image" href="/lexino-website/hero-poster.webp" type="image/webp" fetchPriority="high" />
      <link rel="preload" as="image" href="/lexino-website/logo-96.webp" type="image/webp" />
      <link rel="preload" href="/lexino-website/styles.css" as="style" />

      {/* Priority 2: Inlined critical CSS for 0ms First Contentful Paint */}
      <style dangerouslySetInnerHTML={{ __html: criticalHeroCss }} />

      <link rel="stylesheet" href="/lexino-website/styles.css" />

      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: STATIC_LANDING_HTML }} />
      <script defer src="/lexino-website/script.js" />
    </>
  );
}
