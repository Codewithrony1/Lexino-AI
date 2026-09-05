import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DOC_ARTICLES } from '@/lib/docsData';
import { DocsViewer } from '@/components/docs/DocsViewer';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(DOC_ARTICLES).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = DOC_ARTICLES[slug];
  if (!article) {
    return {
      title: 'Document Not Found — Lexino AI Docs',
    };
  }
  return {
    title: `${article.title} — Lexino AI Documentation`,
    description: article.description,
  };
}

export default async function DocSlugPage({ params }: Props) {
  const { slug } = await params;
  const article = DOC_ARTICLES[slug];

  if (!article) {
    notFound();
  }

  return <DocsViewer article={article} />;
}
