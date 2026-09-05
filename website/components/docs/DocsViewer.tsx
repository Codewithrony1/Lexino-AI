'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DocArticle, DOC_CATEGORIES, DOC_ARTICLES } from '@/lib/docsData';

interface DocsViewerProps {
  article: DocArticle;
}

export function DocsViewer({ article }: DocsViewerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Filter articles based on search query
  const matchingArticles = searchQuery.trim()
    ? Object.values(DOC_ARTICLES).filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#07070a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <Link href="/docs" className="flex items-center gap-3">
              <span className="text-xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 bg-clip-text text-transparent tracking-wider">
                LEXINO<sup className="text-xs text-cyan-400 ml-0.5">AI</sup>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                DOCS
              </span>
            </Link>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              🔍
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation (e.g. API, chat, models, pricing)..."
              className="w-full pl-9 pr-4 py-1.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Platform Cross-Links */}
          <div className="flex items-center gap-3">
            <a
              href="https://www.lexinoai.in"
              className="text-xs text-slate-400 hover:text-white transition hidden md:inline-block"
            >
              Main Website
            </a>
            <a
              href="https://accounts.lexinoai.in"
              className="text-xs text-slate-400 hover:text-white transition hidden sm:inline-block"
            >
              Account
            </a>
            <a
              href="https://chat.lexinoai.in"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-slate-950 transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              Open Chat 🚀
            </a>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex">
        {/* Left Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } md:block fixed md:sticky top-16 z-30 inset-x-0 md:inset-x-auto w-full md:w-64 h-[calc(100vh-4rem)] overflow-y-auto bg-[#07070a] md:bg-transparent border-r border-white/10 p-6 space-y-8`}
        >
          {/* Mobile search bar if menu is open */}
          <div className="sm:hidden mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-xs text-slate-200"
            />
          </div>

          {matchingArticles ? (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Search Results ({matchingArticles.length})
              </div>
              {matchingArticles.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">No matching topics found.</div>
              ) : (
                matchingArticles.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/docs/${item.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block p-2 rounded-lg text-xs hover:bg-white/[0.05] text-slate-300 hover:text-white"
                  >
                    <div className="font-semibold text-cyan-300">{item.title}</div>
                    <div className="text-[10px] text-slate-500 truncate">{item.description}</div>
                  </Link>
                ))
              )}
            </div>
          ) : (
            DOC_CATEGORIES.map((cat) => (
              <div key={cat.title} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.title}</span>
                </h3>
                <ul className="space-y-1 pl-6 border-l border-white/10">
                  {cat.items.map((item) => {
                    const isActive = article.slug === item.slug;
                    return (
                      <li key={item.slug}>
                        <Link
                          href={`/docs/${item.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block py-1.5 px-3 rounded-lg text-xs transition ${
                            isActive
                              ? 'bg-cyan-500/10 text-cyan-400 font-semibold border-l-2 border-cyan-400 -ml-[25px]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 py-8 md:py-10 md:px-12 max-w-4xl">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-mono">
            <Link href="/docs" className="hover:text-slate-300">
              Docs
            </Link>
            <span>/</span>
            <span className="text-slate-400">{article.category}</span>
            <span>/</span>
            <span className="text-cyan-400 font-semibold">{article.title}</span>
          </nav>

          {/* Title Header */}
          <div className="border-b border-white/10 pb-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-slate-100 tracking-tight">{article.title}</h1>
            </div>
            <p className="text-base text-slate-400 leading-relaxed">{article.description}</p>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 font-mono">
              <span>⏱️ {article.readTime}</span>
              <span>•</span>
              <span className="text-emerald-400">Public Document (No Sign-in Needed)</span>
            </div>
          </div>

          {/* Lead Intro */}
          <p className="text-base text-slate-300 leading-relaxed mb-8 font-normal">{article.content.lead}</p>

          {/* Article Sections */}
          <div className="space-y-10">
            {article.content.sections.map((sec, idx) => (
              <section key={idx} className="space-y-4">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-cyan-400 font-mono text-sm">#</span>
                  {sec.heading}
                </h2>

                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  {sec.body.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>

                {/* Callout */}
                {sec.callout && (
                  <div
                    className={`p-4 rounded-xl text-xs leading-relaxed border ${
                      sec.callout.type === 'tip'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : sec.callout.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    <span className="font-bold mr-2 uppercase tracking-wider">
                      {sec.callout.type === 'tip' ? '💡 Tip:' : sec.callout.type === 'warning' ? '⚠️ Caution:' : 'ℹ️ Note:'}
                    </span>
                    {sec.callout.text}
                  </div>
                )}

                {/* Code Snippet with Copy Button */}
                {sec.code && (
                  <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/10 text-xs font-mono text-slate-400">
                      <span>{sec.code.language}</span>
                      <button
                        onClick={() => handleCopyCode(sec.code!.code, `code-${idx}`)}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-xs transition"
                      >
                        {copiedCodeId === `code-${idx}` ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                      <code>{sec.code.code}</code>
                    </pre>
                  </div>
                )}

                {/* Comparison Table */}
                {sec.table && (
                  <div className="overflow-x-auto rounded-xl border border-white/10 my-4">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/[0.05] border-b border-white/10 text-slate-300 uppercase font-mono">
                        <tr>
                          {sec.table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                        {sec.table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.02]">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`p-3 ${cIdx === 0 ? 'font-bold text-slate-100' : ''}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Previous / Next Navigation */}
          <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {article.prev ? (
              <Link
                href={article.prev.href}
                className="p-4 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-white/[0.02] hover:bg-white/[0.05] transition group flex flex-col"
              >
                <span className="text-[10px] uppercase font-mono text-slate-500 group-hover:text-cyan-400">
                  ← Previous
                </span>
                <span className="text-sm font-bold text-slate-200 group-hover:text-white mt-1">
                  {article.prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {article.next ? (
              <Link
                href={article.next.href}
                className="p-4 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-white/[0.02] hover:bg-white/[0.05] transition group flex flex-col text-right sm:items-end"
              >
                <span className="text-[10px] uppercase font-mono text-slate-500 group-hover:text-cyan-400">
                  Next →
                </span>
                <span className="text-sm font-bold text-slate-200 group-hover:text-white mt-1">
                  {article.next.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 Lexino AI • All Documentation is Open Source</p>
            <div className="flex gap-4">
              <a href="https://www.lexinoai.in/terms" className="hover:text-slate-400">
                Terms
              </a>
              <a href="https://www.lexinoai.in/privacy" className="hover:text-slate-400">
                Privacy
              </a>
              <a href="https://chat.lexinoai.in" className="hover:text-cyan-400">
                Launch App
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
