import type { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ChatUserButtonMount } from '../../components/ChatUserButtonMount';
import { DeferredScripts } from '../../components/DeferredScripts';
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
          // Every chat page load previously issued an unconditional upsert, i.e. a
          // write (and its WAL flush + replication) on a pure read path, even when
          // nothing about the profile had changed. Reading first turns the common
          // case into a single indexed primary-key lookup and only writes when the
          // Clerk profile actually differs - same end state, far less DB work.
          dbUser = await prisma.user.findUnique({ where: { id: user.id } });

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: { id: user.id, email, name, avatarUrl },
            });
          } else if (
            dbUser.email !== email ||
            dbUser.name !== name ||
            dbUser.avatarUrl !== avatarUrl
          ) {
            dbUser = await prisma.user.update({
              where: { id: user.id },
              data: { email, name, avatarUrl },
            });
          }
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
      {/* `marked` comes from a third-party origin; warming the connection while the
          document is still parsing removes the DNS + TLS handshake from its
          critical path. */}
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      <DeferredScripts
        scripts={[
          'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
          '/api.js',
          '/script.js',
        ]}
      />
    </>
  );
}
