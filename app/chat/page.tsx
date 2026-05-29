import fs from 'node:fs';
import path from 'node:path';
import { auth } from '@clerk/nextjs/server';
import { ChatUserButtonMount } from '../../components/ChatUserButtonMount';
import { ClientScriptLoader } from '../../components/ClientScriptLoader';

function getLegacyChatBody() {
  const html = fs
    .readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')
    .replace(/\r\n/g, '\n');
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '')
    .replaceAll('src="Images/', 'src="/Images/')
    .replaceAll("src='Images/", "src='/Images/");
}

export default async function ChatPage() {
  await auth.protect();
  const chatMarkup = getLegacyChatBody();

  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <div dangerouslySetInnerHTML={{ __html: chatMarkup }} />
      <ChatUserButtonMount />
      <ClientScriptLoader scripts={['https://cdn.jsdelivr.net/npm/marked/marked.min.js', '/api.js', '/script.js']} />
    </>
  );
}
