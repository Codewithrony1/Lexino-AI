import type { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ChatUserButtonMount } from '../../components/ChatUserButtonMount';
import { ClientScriptLoader } from '../../components/ClientScriptLoader';
import { prisma } from '../../lib/prisma';
import { STATIC_CHAT_HTML } from '../../lib/staticChatHtml';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Workspace & AI Chatbot Dashboard',
  description: 'Your intelligent thinking space on Lexino AI. Prepare for exams, code, and automate tasks.',
  robots: {
    index: false,
    follow: false,
  },
};

function getLegacyChatBody() {
  return STATIC_CHAT_HTML;
}

export default async function ChatPage() {
  let authResult: any = null;
  try {
    authResult = await auth();
  } catch {
    authResult = null;
  }
  
  if (!authResult?.userId) {
    redirect('/login?redirect_url=/chat');
  }
  
  let userData = { id: '', name: 'User', email: '', imageUrl: '', tier: 'FREE', cooldownUntil: null as string | null, messageCountToday: 0 };
  
  try {
    const user = await currentUser();
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
  } catch (err) {
    console.error('Error loading currentUser in ChatPage:', err);
  }

  const chatMarkup = getLegacyChatBody();

  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: chatMarkup }} />
      <script
        id="clerk-user-data"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(userData) }}
      />
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
