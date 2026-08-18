import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ChatUserButtonMount } from '../../components/ChatUserButtonMount';
import { ClientScriptLoader } from '../../components/ClientScriptLoader';
import { prisma } from '../../lib/prisma';

export const metadata: Metadata = {
  title: 'Workspace & AI Chatbot Dashboard',
  description: 'Your intelligent thinking space on Lexino AI. Prepare for exams, code, and automate tasks.',
  robots: {
    index: false,
    follow: false,
  },
};

function getLegacyChatBody() {
  const possiblePaths = [
    path.join(process.cwd(), 'index.html'),
    path.join(process.cwd(), 'website', 'index.html'),
    path.join(process.cwd(), 'public', 'index.html'),
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
    .replaceAll('src="Images/', 'src="/Images/')
    .replaceAll("src='Images/", "src='/Images/");
}

export default async function ChatPage() {
  await auth.protect();
  
  const user = await currentUser();
  let userData = { id: '', name: 'Ritik', email: '', imageUrl: '', tier: 'FREE', cooldownUntil: null as string | null, messageCountToday: 0 };
  
  if (user) {
    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
    const avatarUrl = user.imageUrl;
    
    let dbUser: any = null;
    if (process.env.DATABASE_URL) {
      try {
        dbUser = await prisma.user.upsert({
          where: { id: user.id },
          update: { email, name, avatarUrl },
          create: { id: user.id, email, name, avatarUrl },
        });
      } catch (err) {
        console.error('Error auto-syncing user on page load:', err);
      }
    }
    
    userData = {
      id: user.id,
      name,
      email,
      imageUrl: avatarUrl,
      tier: dbUser?.tier || 'FREE',
      cooldownUntil: dbUser?.cooldownUntil ? dbUser.cooldownUntil.toISOString() : null,
      messageCountToday: dbUser?.messageCountToday || 0,
    };
  }

  const chatMarkup = getLegacyChatBody();

  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: chatMarkup }} />
      <div
        id="nextjs-user-data"
        style={{ display: 'none' }}
        data-user={JSON.stringify(userData)}
      />
      <ChatUserButtonMount />
      <ClientScriptLoader
        scripts={[
          'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
          '/api.js',
          '/script.js',
        ]}
      />
    </>
  );
}
