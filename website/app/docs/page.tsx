'use client';

import React from 'react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-500 bg-clip-text text-transparent">
              Lexino AI — Developer & API Documentation
            </h1>
            <span className="px-2.5 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded text-xs font-mono font-bold">
              v1.0
            </span>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
          >
            ← Home
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-2 text-sm">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400 font-bold">
              ⚡ Quickstart
            </div>
            <div className="p-3 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-xl text-slate-400 font-medium transition cursor-pointer">
              💬 Chat Streaming API
            </div>
            <div className="p-3 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-xl text-slate-400 font-medium transition cursor-pointer">
              📁 Uploads & RAG Vault
            </div>
            <div className="p-3 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-xl text-slate-400 font-medium transition cursor-pointer">
              🗜️ Binary Cold Storage
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">API Endpoint Reference</h2>
              <p className="text-sm text-slate-400 mt-1">
                All production API endpoints are hosted at:
              </p>
              <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-400">
                https://chat.lexinoai.in/api/v1/chat
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-200">Example Request (cURL):</h3>
              <pre className="mt-2 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`curl -X POST https://chat.lexinoai.in/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Explain Schrödinger wave equation in simple terms",
    "selectedModel": "default"
  }'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
