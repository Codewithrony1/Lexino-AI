import type { Metadata } from 'next';
import { DOC_ARTICLES } from '@/lib/docsData';
import { DocsViewer } from '@/components/docs/DocsViewer';

export const metadata: Metadata = {
  title: 'Documentation — Lexino AI Platform',
  description: 'Official developer, user, and API documentation for Lexino AI: Chat assistant, reasoning models, project vaults, and REST API integration.',
};

export default function DocsHomePage() {
  const article = DOC_ARTICLES['getting-started'];
  return <DocsViewer article={article} />;
}
