import fs from 'node:fs';
import path from 'node:path';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ClientScriptLoader } from '../components/ClientScriptLoader';

export function getWebsiteBody() {
  const html = fs
    .readFileSync(path.join(process.cwd(), 'Lexino Website', 'index.html'), 'utf8')
    .replace(/\r\n/g, '\n');
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
      <link rel="stylesheet" href="/lexino-website/styles.css" />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: websiteMarkup }} />
      <ClientScriptLoader scripts={['/lexino-website/script.js']} />
    </>
  );
}
