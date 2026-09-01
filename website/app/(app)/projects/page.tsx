'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects] = useState([
    { id: '1', name: 'JEE Advanced Prep Vault', icon: '📚', items: '14 Chats • 6 Notes', updated: '2 hours ago', color: 'from-cyan-500/20 to-blue-500/20' },
    { id: '2', name: 'DSA & LeetCode Roadmap', icon: '💻', items: '32 Problem Breakdowns', updated: 'Yesterday', color: 'from-violet-500/20 to-purple-500/20' },
    { id: '3', name: 'UPSC General Studies Revision', icon: '🏛️', items: '8 Timetables • 12 Summaries', updated: '3 days ago', color: 'from-amber-500/20 to-orange-500/20' },
  ]);

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-500 bg-clip-text text-transparent">
                Projects & Knowledge Vaults
              </h1>
              <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-xs font-mono font-bold">
                WORKSPACE
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Organize your exams, coding roadmaps, and research notes into dedicated AI-powered workspaces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              ← Back to Chat
            </Link>
            <button
              onClick={() => alert('New project workspace creation will be available in the next release!')}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-500/20"
            >
              + Create Project
            </button>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`p-6 rounded-2xl bg-gradient-to-br ${p.color} border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col justify-between h-52 backdrop-blur-sm group`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl p-3 bg-slate-900/60 rounded-xl border border-slate-800 group-hover:scale-110 transition">
                  {p.icon}
                </span>
                <span className="text-xs text-slate-500">{p.updated}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{p.items}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
