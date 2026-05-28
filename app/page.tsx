import fs from 'node:fs';
import path from 'node:path';
import { ClientScriptLoader } from '../components/ClientScriptLoader';

function getWebsiteBody() {
  const html = fs
    .readFileSync(path.join(process.cwd(), 'Lexino Website', 'index.html'), 'utf8')
    .replace(/\r\n/g, '\n');
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';

  return body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '')
    .replaceAll('src="Lexino_AI_Logo-removebg-preview.png"', 'src="/lexino-logo.png"')
    .replaceAll('src="mp_.mp4"', 'src="/lexino-website/mp_.mp4"')
    .replaceAll(
      'src="/Lexino Website/Manifest Anything You Desire  10 Minute Meditation Music.mp3"',
      'src="/lexino-website/Manifest Anything You Desire  10 Minute Meditation Music.mp3"',
    );
}

export default function LandingPage() {
  const websiteMarkup = getWebsiteBody();

  return (
    <>
      <link rel="stylesheet" href="/lexino-website/styles.css" />
      <div dangerouslySetInnerHTML={{ __html: websiteMarkup }} />
      <ClientScriptLoader scripts={['/lexino-website/script.js']} />
    </>
  );
}
