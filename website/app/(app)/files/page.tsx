'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function FilesPage() {
  const [files] = useState([
    { id: '1', name: 'Physics_Thermodynamics_Formulas.pdf', type: 'PDF', size: '2.4 MB', extracted: '14 Pages Indexed', uploaded: 'Yesterday' },
    { id: '2', name: 'DSA_Graph_Algorithms.cpp', type: 'C++', size: '18 KB', extracted: 'Indexed for Code Search', uploaded: '3 days ago' },
    { id: '3', name: 'Organic_Chemistry_Reactions.txt', type: 'TXT', size: '45 KB', extracted: 'Indexed for RAG', uploaded: '1 week ago' },
  ]);

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-500 bg-clip-text text-transparent">
                Document & File Vault
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono font-bold">
                RAG KNOWLEDGE
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Uploaded study notes, textbooks, and code repositories used for grounding AI chat responses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              ← Back to Chat
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
            >
              + Upload in Chat
            </Link>
          </div>
        </div>

        {/* Files Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Indexed Files ({files.length})</span>
            <span className="text-xs text-slate-500">Storage Used: ~2.5 MB / 100 MB</span>
          </div>

          <div className="divide-y divide-slate-800/60 text-sm">
            {files.map((file) => (
              <div key={file.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                    {file.type === 'PDF' ? '📄' : file.type === 'TXT' ? '📝' : '💻'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{file.name}</div>
                    <div className="text-xs text-slate-500">{file.size} • {file.extracted}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">{file.uploaded}</span>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold">
                    Indexed ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
